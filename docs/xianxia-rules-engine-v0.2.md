# Xianxia Rules Engine v0.2

## 已实现
1. 规则守卫层：`src/core/xianxiaGuard.ts`
   - 终局词门禁（非道祖大圆满自动替换终局词）
   - 位面词屏蔽（人界屏蔽仙界专名）
   - 单一 `ini` 块约束（多块自动收敛）

2. 媒体触发层：`src/core/xianxiaMedia.ts`
   - 预留按“大境界突破”触发媒体 Markdown
   - 当前引擎已支持把触发结果透传到 webhook `media` 字段

3. 规则配置读取：`src/core/xianxiaRules.ts`
   - 读取 `data/xianxia.rules.json` 作为硬规则来源

4. OpenClaw 回包扩展
   - `game_state.plane`
   - `media`（媒体指令数组）

## 下一步
1. 把“境界-位面一致性”从文本替换升级为结构化校验错误码。
2. 将飞升、结丹、大乘、金仙媒体触发接入真实突破事件。
3. 引入 NPC 天赋与战斗等级压制计算器。
