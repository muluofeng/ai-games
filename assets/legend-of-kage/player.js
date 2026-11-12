'use strict';

// 页面状态实体：只管理外层播放器，角色、关卡、道具和音乐全部由原版数据驱动。
const state = { mode: 'loading', muted: false, frames: 0, error: null };
const byId = id => document.getElementById(id);
const C = jsnes.Controller;
const keyMap = new Map([
  ['ArrowLeft', C.BUTTON_LEFT], ['KeyA', C.BUTTON_LEFT],
  ['ArrowRight', C.BUTTON_RIGHT], ['KeyD', C.BUTTON_RIGHT],
  ['ArrowUp', C.BUTTON_UP], ['KeyW', C.BUTTON_UP], ['Space', C.BUTTON_UP],
  ['ArrowDown', C.BUTTON_DOWN], ['KeyS', C.BUTTON_DOWN],
  ['KeyZ', C.BUTTON_A], ['KeyX', C.BUTTON_B],
  ['Enter', C.BUTTON_START], ['ShiftLeft', C.BUTTON_SELECT],
  ['ShiftRight', C.BUTTON_SELECT],
]);
const activeInputs = new Map();
const buttonSources = new Map();
let bootGeneration = 0;

function status(message) { byId('status').textContent = message; }
function fail(error) {
  state.error = String(error.message || error);
  state.mode = 'error';
  browser.stop();
  status('运行失败：' + state.error + '。请点击重启重试。');
  byId('start').disabled = true;
  byId('pause').disabled = true;
}

// 复用 JSNES 官方 Browser 适配层，直接使用其渲染、声音、手柄和帧定时器。
const browser = new jsnes.Browser({
  container: byId('nes-host'),
  onError: fail,
});
// 禁用库的默认键位，避免与本页的 Z 挥刀、X 飞镖和触屏映射重复触发。
browser.keyboard.keys = {};
// 暂停后音频缓冲区的回调不能再推进游戏帧。
const nativeUnderrun = browser._speakers.onBufferUnderrun;
browser._speakers.onBufferUnderrun = () => {
  if (state.mode === 'running') nativeUnderrun();
};
const nativeFrame = browser.nes.frame.bind(browser.nes);
browser.nes.frame = () => {
  // 上游定时器可能已有待执行的补帧回调，暂停后这些回调不能推进原版状态。
  if (state.mode !== 'running') return;
  nativeFrame();
  state.frames++;
};
const nesCanvas = byId('nes-host').querySelector('canvas');
nesCanvas.id = 'game';
nesCanvas.tabIndex = 0;
nesCanvas.setAttribute('aria-label', '影子传说 FC 原版。方向键移动、跳跃和攀树，Z 挥刀，X 飞镖，Enter 为 START，Shift 为 SELECT，P 暂停播放器。');
// 保留 NES 的 256×240 原始画布，按传统电视的 4:3 比例展示，不重新绘制图像。
nesCanvas.style.width = '100%';
nesCanvas.style.height = '100%';

// 把内嵌原版文件解码交给模拟器；不再维护自编角色、场景、敌人或碰撞逻辑。
const romBytes = Uint8Array.from(atob(document.getElementById('rom-data').textContent.trim()), ch => ch.charCodeAt(0));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function boot() {
  const generation = ++bootGeneration;
  releaseAll();
  state.mode = 'loading';
  state.error = null;
  byId('start').disabled = true;
  byId('reset').disabled = true;
  byId('pause').disabled = true;
  byId('overlay').hidden = true;
  byId('boot-preview').hidden = false;
  status('正在准备原版游戏…');
  browser.stop();
  browser.nes.loadROM(romBytes);
  state.frames = 0;
  // 原版开机画面有滚动入场；快速运行至菜单，不改动原版内存与游戏规则。
  try {
    for (let i = 0; i < 600; i += 30) {
      if (generation !== bootGeneration) return;
      for (let j = 0; j < 30; j++) { nativeFrame(); state.frames++; }
      await delay(0);
    }
    browser._screen.writeBuffer();
    byId('boot-preview').hidden = true;
    state.mode = 'ready';
    byId('start').disabled = false;
    byId('reset').disabled = false;
    byId('select').disabled = false;
    byId('start').textContent = '▶ 开始游戏';
    status('原版已就绪。Enter 开始，Shift 切换单人 / 双人。');
  } catch (error) { byId('reset').disabled = false; fail(error); }
}

// 当前固定为 JSNES 2.1.0；复用其声音节点，静音和暂停时不重新创建音频链路。
async function syncAudio() {
  for (let i = 0; i < 40; i++) {
    const speakers = browser._speakers;
    if (!speakers.audioCtx) return;
    if (speakers.node) {
      try {
        if (state.muted || state.mode !== 'running') await speakers.audioCtx.suspend();
        else await speakers.audioCtx.resume();
      } catch (error) { console.warn('切换声音状态失败', error); }
      return;
    }
    await delay(20);
  }
}

function startEngine() {
  if (state.mode === 'ready') {
    state.mode = 'running';
    browser.start();
    byId('pause').disabled = false;
    byId('start').textContent = 'START / 开始·暂停';
    void syncAudio();
    status('正在运行 FC 原版。P 暂停播放器，Enter 为原版 START。');
  }
}

// 每个按钮支持多个来源，避免松开空格时误释放仍按住的方向键或触屏按键。
function inputDown(source, button) {
  if (state.mode === 'loading' || state.mode === 'error' || activeInputs.has(source)) return;
  if (state.mode === 'paused') return;
  if (state.mode === 'ready') startEngine();
  const sources = buttonSources.get(button) || new Set();
  sources.add(source);
  buttonSources.set(button, sources);
  activeInputs.set(source, { button, since: performance.now(), generation: bootGeneration });
  browser.nes.buttonDown(1, button);
}

function inputUp(source) {
  const input = activeInputs.get(source);
  if (!input) return;
  activeInputs.delete(source);
  // 保证快速点击至少覆盖两个 NES 采样帧，避免按下和松开发生在同一帧之间。
  setTimeout(() => {
    if (input.generation !== bootGeneration) return;
    if (activeInputs.has(source)) return;
    const sources = buttonSources.get(input.button);
    sources?.delete(source);
    if (!sources?.size) {
      browser.nes.buttonUp(1, input.button);
      buttonSources.delete(input.button);
    }
  }, Math.max(0, 40 - (performance.now() - input.since)));
}

function pulse(button, source = 'virtual-' + button) {
  inputDown(source, button);
  inputUp(source);
}

function releaseAll() {
  activeInputs.clear();
  buttonSources.clear();
  for (let i = 0; i <= 9; i++) browser.nes.buttonUp(1, i);
  for (const button of document.querySelectorAll('.pad.active')) button.classList.remove('active');
}

function togglePause() {
  if (state.mode === 'running') {
    releaseAll();
    state.mode = 'paused';
    browser._frameTimer.stop();
    void syncAudio();
    byId('overlay').hidden = false;
    byId('pause').textContent = '▶ 继续';
    status('播放器已暂停，原版进度保留。P 或 Enter 继续。');
  } else if (state.mode === 'paused') {
    state.mode = 'running';
    byId('overlay').hidden = true;
    byId('pause').textContent = 'Ⅱ 暂停';
    browser._frameTimer.start();
    void syncAudio();
    status('继续运行 FC 原版。');
    nesCanvas.focus({ preventScroll: true });
  }
}

function toggleSound() {
  state.muted = !state.muted;
  byId('sound').textContent = '♪ 声音 ' + (state.muted ? '关' : '开');
  byId('sound').setAttribute('aria-pressed', String(!state.muted));
  void syncAudio();
}

async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (byId('cabinet').requestFullscreen) await byId('cabinet').requestFullscreen();
    else status('当前浏览器不支持全屏，可横屏游玩。');
  } catch { status('全屏未开启，可以继续在当前窗口游玩。'); }
}

document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target instanceof HTMLButtonElement && ['Enter', 'Space'].includes(event.code)) return;
  const button = keyMap.get(event.code);
  if (button !== undefined) {
    event.preventDefault();
    if (state.mode === 'paused' && event.code === 'Enter' && !event.repeat) togglePause();
    else inputDown('key-' + event.code, button);
  }
  if (event.repeat) return;
  if (event.code === 'KeyP' || event.code === 'Escape') togglePause();
  if (event.code === 'KeyM') toggleSound();
  if (event.code === 'KeyF') void fullscreen();
});
document.addEventListener('keyup', event => inputUp('key-' + event.code));

for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    // 部分 WebView 不支持指针捕获，仍保留正常的按下与松开控制。
    try { button.setPointerCapture(event.pointerId); } catch {}
    button.classList.add('active');
    inputDown('pointer-' + event.pointerId, keyMap.get(button.dataset.key));
  });
  const release = event => { button.classList.remove('active'); inputUp('pointer-' + event.pointerId); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

byId('start').addEventListener('click', () => {
  if (state.mode === 'paused') togglePause();
  else pulse(C.BUTTON_START);
  nesCanvas.focus({ preventScroll: true });
});
byId('select').addEventListener('click', () => pulse(C.BUTTON_SELECT));
byId('resume').addEventListener('click', togglePause);
byId('pause').addEventListener('click', togglePause);
byId('sound').addEventListener('click', toggleSound);
byId('reset').addEventListener('click', () => { void boot(); });
byId('fullscreen').addEventListener('click', fullscreen);
document.addEventListener('fullscreenchange', () => { byId('fullscreen').textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏'; });
window.addEventListener('blur', () => { releaseAll(); if (state.mode === 'running') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.mode === 'running') togglePause(); });
window.addEventListener('pagehide', () => browser.destroy());

// 只读验收快照，不提供修改角色、道具或关卡状态的作弊接口。
window.kageGame = Object.freeze({ snapshot: () => ({
  mode: state.mode, frames: state.frames, engine: 'JSNES 2.1.0',
  mapper: browser.nes.rom?.mapperType, resolution: [256, 240],
  muted: state.muted, audioState: browser._speakers.audioCtx?.state || 'idle',
  audioReady: Boolean(browser._speakers.node), error: state.error,
  buttons: [...buttonSources.keys()],
}) });
void boot();
