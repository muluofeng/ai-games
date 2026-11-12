'use strict';

(() => {
  const byId = id => document.getElementById(id);
  // 播放器状态实体：仅控制暂停、输入与页面提示，战斗规则交给原版复刻引擎。
  const playerState = { paused: false, ready: false, error: null, phase: null, ticks: 0 };
  const sources = new Map();
  const held = new Map();
  const supported = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyJ','KeyX','KeyZ','KeyE','KeyQ','KeyB','Enter','ShiftLeft','ShiftRight']);
  const originalUpdate = update;
  const originalRender = render;
  let storedHiScore = 20000;
  try { storedHiScore = Math.max(20000, Number(localStorage.getItem('battle-city-hi-score')) || 20000); } catch {}
  hiScore = storedHiScore;

  // 按来源记录输入：触屏和键盘同时按同一个按钮时，互不提前释放。
  function press(source, code) {
    if (!playerState.ready || playerState.paused || playerState.error || sources.has(source)) return;
    const record = { code, tick: playerState.ticks, released: false };
    sources.set(source, record);
    held.set(code, (held.get(code) || 0) + 1);
    keys[code] = true;
  }

  // 至少经过一次逻辑采样再松开，避免快速点击丢失，也避免方向键延迟释放。
  function release(source) {
    const record = sources.get(source);
    if (!record || record.released) return;
    record.released = true;
    const finish = () => {
      if (sources.get(source) !== record) return;
      if (playerState.ticks === record.tick) { requestAnimationFrame(finish); return; }
      sources.delete(source);
      const remaining = (held.get(record.code) || 1) - 1;
      if (remaining > 0) held.set(record.code, remaining);
      else { held.delete(record.code); keys[record.code] = false; }
    };
    finish();
  }

  // 失焦和暂停时清空手柄，避免切回页面后坦克仍持续移动。
  function releaseAll() {
    sources.clear(); held.clear();
    for (const code of Object.keys(keys)) keys[code] = false;
    document.querySelectorAll('.pad.active').forEach(el => el.classList.remove('active'));
  }

  function focusGame() { canvas.focus({ preventScroll: true }); }

  // 冻结整个逻辑更新与音频时钟，暂停期间保持关卡、敌军与子弹的位置。
  function setPaused(paused) {
    if (!playerState.ready || playerState.paused === paused) return;
    releaseAll();
    playerState.paused = paused;
    byId('pause-overlay').hidden = !paused;
    byId('pause').textContent = paused ? '▶ 继续' : 'Ⅱ 暂停';
    if (audioCtx) {
      const action = paused || !soundEnabled ? audioCtx.suspend() : audioCtx.resume();
      action.catch(() => {});
    }
    if (!paused) focusGame();
    updatePage();
  }

  // 模式切换明确开始新一局；清除上一局自建地图，避免污染原版关卡。
  function newGame(mode) {
    if (!playerState.ready) return;
    setPaused(false); releaseAll();
    playerState.error = null;
    byId('error').hidden = true;
    customMap = null;
    numPlayers = mode === 1 ? 2 : 1;
    enterTitle();
    quickStart(mode);
    if (audioCtx && soundEnabled) void audioCtx.resume().catch(() => {});
    focusGame();
    updatePage();
  }

  function startButton() {
    if (playerState.paused) { setPaused(false); return; }
    if (gamePhase === 'play' && !demoMode) { setPaused(true); return; }
    initAudio();
    const source = 'start-' + performance.now();
    press(source, 'Enter'); release(source); focusGame();
  }

  function soundButton() {
    initAudio(); toggleSound();
    if (audioCtx) {
      const action = !soundEnabled || playerState.paused ? audioCtx.suspend() : audioCtx.resume();
      action.catch(() => {});
    }
    updatePage();
  }

  // 根据游戏阶段显示中文操作提示，保留画布内部的原版英文像素字体。
  function updatePage() {
    const status = byId('status');
    const messages = {
      title: '原版图块已就绪。Enter 开始，↑ ↓ 选择模式。',
      select: '↑ ↓ 选择关卡（1—35），Enter 或 START 出发。',
      curtain: '准备出发…', start: '准备出发…',
      play: demoMode ? '正在播放演示。点击单人 / 双人作战开始。' : '守住老鹰基地。空格射击，P 暂停。',
      edit: '方向键移动并铺设，空格放置 / 长按换块，B 切换，Enter 出发。',
      clear: '本关已完成，正在统计战绩。', gameover_tally: '战斗结束，正在统计战绩。',
      gameover: '战斗结束。Enter 返回，或选择单人 / 双人重新开始。',
      victory: '35 关作战完成。Enter 返回标题。',
    };
    status.textContent = playerState.error || (playerState.paused ? '已暂停，进度保留。P 或 Enter 继续。' : messages[gamePhase] || '战斗进行中。');
    byId('sound').textContent = soundEnabled ? '♪ 声音开' : '♪ 声音关';
    byId('sound').setAttribute('aria-pressed', String(soundEnabled));
    byId('start').textContent = gamePhase === 'play' && !demoMode ? (playerState.paused ? '继续 ↵' : '暂停 ↵') : 'START ↵';
    const context = byId('context');
    context.classList.toggle('visible', gamePhase === 'select' || gamePhase === 'edit');
    context.textContent = gamePhase === 'select' ? `第 ${selectedStage + 1} 关 / 35 · ↑ ↓ 切换` : '建造模式 · 长按 A 切换图块 · B 向前切换 · START 试玩';
    playerState.phase = gamePhase;
  }

  update = function () {
    if (!playerState.ready || playerState.paused || playerState.error) return;
    playerState.ticks++;
    originalUpdate();
    if (gamePhase !== playerState.phase) updatePage();
    if (gamePhase === 'select' || gamePhase === 'edit') updatePage();
    if (hiScore > storedHiScore) {
      storedHiScore = hiScore;
      try { localStorage.setItem('battle-city-hi-score', String(hiScore)); } catch {}
    }
  };
  render = function () { if (playerState.ready && !playerState.paused && !playerState.error) originalRender(); };

  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLButtonElement && (event.code === 'Enter' || event.code === 'Space')) return;
    if (supported.has(event.code)) {
      event.preventDefault();
      if (event.code === 'Enter' && playerState.paused && !event.repeat) setPaused(false);
      else if (event.code === 'Enter' && gamePhase === 'play' && !demoMode && !event.repeat) setPaused(true);
      else press('key-' + event.code, event.code);
    }
    if (event.repeat) return;
    if (event.code === 'KeyP' || event.code === 'Escape') { event.preventDefault(); setPaused(!playerState.paused); }
    if (event.code === 'KeyM') soundButton();
    if (event.code === 'KeyF') toggleFullscreen();
    if (event.code === 'Digit1') newGame(0);
    if (event.code === 'Digit2') newGame(1);
    if (event.code === 'Digit3') newGame(2);
  });
  document.addEventListener('keyup', event => release('key-' + event.code));

  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      initAudio();
      try { button.setPointerCapture(event.pointerId); } catch {}
      button.classList.add('active');
      press('pointer-' + event.pointerId, button.dataset.key);
    });
    const releasePointer = event => { button.classList.remove('active'); release('pointer-' + event.pointerId); };
    button.addEventListener('pointerup', releasePointer);
    button.addEventListener('pointercancel', releasePointer);
    button.addEventListener('lostpointercapture', releasePointer);
  }
  byId('one-player').addEventListener('click', () => newGame(0));
  byId('two-player').addEventListener('click', () => newGame(1));
  byId('construction').addEventListener('click', () => newGame(2));
  byId('start').addEventListener('click', startButton);
  byId('pause').addEventListener('click', () => setPaused(!playerState.paused));
  byId('resume').addEventListener('click', () => setPaused(false));
  byId('sound').addEventListener('click', soundButton);
  byId('fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => { byId('fullscreen').textContent = document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏'; });
  window.addEventListener('blur', () => { releaseAll(); if (playerState.ready && gamePhase !== 'title') setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playerState.ready) setPaused(true); });
  window.addEventListener('pagehide', () => { releaseAll(); if (audioCtx) void audioCtx.suspend().catch(() => {}); });
  window.addEventListener('error', event => {
    playerState.error = '运行异常：' + event.message;
    byId('error').hidden = false;
    byId('error').textContent = playerState.error + '。请重新打开页面。';
    releaseAll(); stopAllSounds(); updatePage();
  });

  // 等待原版图块解码成功后启用操作，避免黑屏期间开始游戏。
  const readyTimer = setInterval(() => {
    if (!chrOff) return;
    clearInterval(readyTimer);
    playerState.ready = true;
    for (const id of ['one-player','two-player','construction','start','pause']) byId(id).disabled = false;
    updatePage(); render();
  }, 25);
  setTimeout(() => {
    if (playerState.ready) return;
    clearInterval(readyTimer);
    playerState.error = '原版图块加载失败，请重新打开 HTML 文件。';
    byId('error').hidden = false;
    updatePage();
  }, 10000);

  // 只读验收接口：用于确认图块、关卡、玩家位置与暂停状态。
  window.battleCity = Object.freeze({ snapshot: () => ({
    ready: playerState.ready, paused: playerState.paused, phase: gamePhase,
    frame: frameCount, stage: (stageIdx || 0) + 1, selectedStage: selectedStage + 1,
    levels: LEVEL_MAPS.length, players: numPlayers || 0, enemiesLeft,
    eagleAlive, score: p1Score, lives: p1Lives, hiScore,
    audio: audioCtx?.state || 'idle', sound: soundEnabled, error: playerState.error,
    entities: entities?.map(e => ({ slot: e.slot, x: e.x, y: e.y, alive: e.alive, spawnAnim: e.spawnAnim })),
    bullets: bullets?.filter(b => b.active).map(b => ({ x: b.x, y: b.y, owner: b.owner })),
    keys: Object.keys(keys).filter(code => keys[code]),
  }) });
})();
