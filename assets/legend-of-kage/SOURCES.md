# 影子传说：素材与运行组件来源

本目录记录联网取得的原版素材与第三方组件。游戏页面已经移除早期手绘角色、手绘场景和自编关卡逻辑，直接使用 JSNES 运行原版数据。

## 原版游戏数据

- 文件：`original/legend-of-kage.nes`
- 下载来源：[KiligWYu/PlayForFun：影子传说.nes](https://github.com/KiligWYu/PlayForFun/blob/main/rom/%E5%BD%B1%E5%AD%90%E4%BC%A0%E8%AF%B4.nes)
- 原始下载：[GitHub Raw](https://raw.githubusercontent.com/KiligWYu/PlayForFun/main/rom/%E5%BD%B1%E5%AD%90%E4%BC%A0%E8%AF%B4.nes)
- 取得日期：2026-11-12。
- 文件大小：49,168 字节。
- SHA-256：`72fce2a76b602d96268a4800e2b981f8d44c761fb7bf2d83f1dd486d17dc075f`。
- 已校验 iNES 文件头、2 个 PRG-ROM bank、2 个 CHR-ROM bank，以及 Mapper 3 / CNROM。
- 角色动画、敌人、道具、树林、城楼、标题、音乐和游戏规则由该数据及模拟器输出，没有用自绘图形替代。
- 原游戏及美术归原权利人所有；公开仓库地址不代表该文件采用 JSNES 的开源许可。

## 网上下载的主角动画图集

- 文件：`original/kage.png`。
- 游戏目录：[Sprite Database / The Legend of Kage](https://spritedatabase.net/game/3777)。
- 资源页：[Kage](https://spritedatabase.net/file/31754)。
- 原始图片：[Kage.png](https://spritedatabase.net/files/nes/3777/Sprite/Kage.png)。
- 图集提交者：ShadowMan44，见站点的[提交记录](https://spritedatabase.net/forums/index.php?topic=48380.15)。
- 原文件保留用于核对；当前运行画面直接由原版数据输出，无需重新切图或拼装动作。

## 从原版数据导出的图片

- `original/title.png`：原版开机第 600 帧的标题画面，256 × 240。
- `original/forest.png`：从原版菜单开始游戏后导出的森林实机画面，256 × 240。
- `original/tiles-and-items.png`：原版 CHR 图块及当前关卡调色板的组合预览，用于核对图块；各调色板组合不代表其一定在对应关卡使用。实际游戏由原版程序选择图块、调色板和动画。
- 上述文件是原版数据渲染输出，没有添加或重绘角色、道具和场景。

## JSNES 模拟器

- 上游：[bfirsh/jsnes](https://github.com/bfirsh/jsnes)。
- 固定版本：2.1.0。
- 包地址：[npm jsnes-2.1.0.tgz](https://registry.npmjs.org/jsnes/-/jsnes-2.1.0.tgz)。
- npm 包完整性：`sha512-LUa++E5Dfs1A6ZYB5HiSOR4JrUzrZEXGLZ5Imczhu9lkg7f+94SqnLZ/MXwGa7oc02+j/xYyHR0azGQ6LCU68g==`，下载后已校验。
- 许可：Apache-2.0，全文见 `vendor/LICENSE`，同时内嵌在生成的 HTML 中。
- `vendor/jsnes.min.js` 保留 npm 上游原始发行文件。
- 单文件打包时应用三处兼容调整：AudioWorklet 使用内嵌 data URL，以支持 `file://`；AudioContext 明确使用 44,100Hz，以匹配 Browser 初始化时传给 NES 的采样率；停止定时器后忽略已排队的补帧回调，防止暂停和重启时意外推进游戏。没有更改 CPU、PPU、APU、Mapper 或原版游戏数据。
- `player.js` 仅连接页面按钮、键盘、触屏、暂停与全屏，复用上游 Browser 的画面、音频、手柄与定时器。

## 本地生成

```sh
python3 scripts/build-shadow-of-kage.py
```

生成根目录的 `shadow-of-kage.html`。模拟器、原版数据和标题预览均已内嵌，可直接双击 HTML 离线打开，不依赖 CDN 或本地服务器。
