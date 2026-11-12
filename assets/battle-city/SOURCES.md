# 坦克大战 HTML：运行与素材来源

入口：[battle-city.html](../../battle-city.html)。直接双击即可离线打开，不需要安装依赖、启动服务或连接 CDN。

重新打包：

```sh
python3 scripts/build-battle-city.py
```

## 实现范围

以 FC / Famicom 1985 年版《Battle City》为还原目标，使用原版 CHR 图块、35 关地图、敌军配置和音效序列。坦克、砖墙、钢墙、树林、水面、冰面、老鹰、道具、标题及文字均由原版图块绘制，没有用 Emoji 或新画的图形替代。

浏览器战斗逻辑基于 `vgrichina/battlecity` 的开源 JavaScript 复刻实现，不是逐周期 NES 模拟器，因此不承诺随机序列、碰撞或音频波形与原机逐帧完全一致。没有下载或内嵌完整商业 ROM。

本项目新增中文外层页面、单文件离线打包、键盘/触屏统一输入、暂停及失焦冻结、多输入来源管理、最高分保存和中文提示。没有接入现有 macTools 的工具导航，也没有修改其已有业务功能。

## 原版图块

- 文件：`original/chr_all.png`，289 × 145 像素。
- 来源：[vgrichina/battlecity / web/tiles/chr_all.png](https://github.com/vgrichina/battlecity/blob/main/web/tiles/chr_all.png)。
- 下载：[GitHub Raw](https://raw.githubusercontent.com/vgrichina/battlecity/main/web/tiles/chr_all.png)。
- 上游说明：从原版 8 KB CHR 数据提取，512 个 8 × 8 图块，按 32 × 16 排列，图块之间有 1 像素边框；运行时按原版调色板着色。
- SHA-256：`ce576fdd7355f023d8945fa873d45d3d995dc5ec64cad9336b803bcc97378590`。
- 取得日期：2026-11-12。
- 原游戏和美术版权属于 NAMCO / Bandai Namco Entertainment。公开提取文件的可下载性不意味着素材版权发生转移。

## 第三方复刻引擎

- 上游：[vgrichina/battlecity](https://github.com/vgrichina/battlecity)。
- 作者：Vladimir Grichina 及上游贡献者。
- 许可：上游 README 声明逆向笔记、工具及 Web 实现采用 MIT；本目录的 `THIRD_PARTY_NOTICES.md` 保留署名与 MIT 许可条款。原版游戏素材不受此开源许可覆盖。
- 取得日期：2026-11-12，从 `main` 下载；下列 SHA-256 固定本地取得的准确文件版本。

| 文件 | 原始路径 | SHA-256 |
| --- | --- | --- |
| `vendor/game.js` | `web/game.js` | `10778f33232eebdba9a5e1b1335cc3be49d005815d36bab5df42bf238361e82f` |
| `vendor/levels.js` | `web/levels.js` | `83a70acd4efb6e14124537de9644fe67855d649ebd08a065cad5b36dde84b227` |
| `vendor/sound.js` | `web/sound.js` | `3ff27563eabaaf9a11f94e64f9cfbe8a03465a514e86d6083825f4a26aaecc96` |

`vendor` 保存上游原文件。打包时内嵌 CHR 图片、替换上游全局键盘监听器，按住选关的重复计时改为从本次输入开始，移除建造快捷入口对未声明变量 `editAFirst` 的赋值，并为实体与关卡初始化补充中文注释。页面控制在 `player.js` 中适配；上游移动、敌军 AI、碰撞、道具、计分、关卡数据及音效序列保持其实现。

## 操作

| 操作 | 按键 |
| --- | --- |
| 一号玩家移动 | 方向键；单人模式也支持 WASD |
| 一号玩家射击 | 空格 / J |
| 二号玩家移动 | WASD |
| 二号玩家射击 | E / Q |
| 开始 / 确认 / 战斗中暂停 | Enter 或 START 按钮 |
| 暂停 / 继续 | P / Esc |
| 声音 | M |
| 全屏 | F |
| 开始单人 / 双人 / 建造新一局 | 1 / 2 / 3 或对应页面按钮 |
| 选择关卡 | ↑ ↓，Enter 确认 |
| 建造地图 | 方向键移动并铺设；空格放置、长按换块；B / X 向前换块；Enter 试玩 |

手机显示触屏方向键与 A / B 按钮。双人模式的二号玩家使用键盘。切换单人、双人或建造按钮会开始新一局。失焦或隐藏页面自动暂停，回到页面后由用户手动继续。
