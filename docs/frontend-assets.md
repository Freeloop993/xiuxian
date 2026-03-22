# 前端素材清单（轻量版）

完整中文文生图提示词与剧情-地图绑定方案见：`docs/map-assets-prompts-cn.md`

按你当前需求，先只做三类素材：主地图、挂机状态图标、基础 UI 图标。

## 你这次提交的 6 张图可用映射

1. 主地图图 -> `public/assets/map/world-map-main.png`
2. 挂机中图标 -> `public/assets/ui/icon-idle-on.png`
3. 未挂机图标 -> `public/assets/ui/icon-idle-off.png`
4. 罗盘图标 -> `public/assets/ui/icon-poi.png`
5. 深色方形边框图 -> `public/assets/ui/panel-bg.png`
6. 浅色长条边框图 -> `public/assets/ui/button-main.png`

## 立绘新增素材

1. 男修立绘 -> `public/assets/ui/avatar-male.png`
2. 女修立绘 -> `public/assets/ui/avatar-female.png`

说明：自定义上传走前端本地预览，不强制服务器存储。

## 1) 主地图（必需）

1. `public/assets/map/world-map-main.png`
- 用途：地图面板背景图
- 建议尺寸：`1600x900`（16:9）
- 风格：像素/国风修仙俯视图，区域边界清晰

## 2) 挂机状态图标（必需）

1. `public/assets/ui/icon-idle-on.png`
- 含义：挂机中 / 状态锁开启
- 建议尺寸：`72x72`

2. `public/assets/ui/icon-idle-off.png`
- 含义：未挂机 / 可交互
- 建议尺寸：`72x72`

## 3) 基础 UI 图标（可选）

1. `public/assets/ui/icon-hp.png`
2. `public/assets/ui/icon-mp.png`
3. `public/assets/ui/icon-cultivation.png`
4. `public/assets/ui/icon-map-poi.png`

- 建议尺寸：`64x64` 或 `96x96`
- 透明底 PNG

---

## 说明

- 物品栏当前为**纯文字模式**，不需要物品图标。
- 你先给「主地图 + 挂机 on/off 两张图」就能把视觉提升一大截。

## 出图风格建议（统一）

`pixel art`, `xianxia`, `top-down RPG UI`, `clean silhouette`, `no text`, `transparent background`

