# Xianxia Rules Engine v0.3

## 新增能力
1. 结构化规则错误码（`rule_violations`）
   - `E_RULE_REALM_CHEAT`: 用户直接宣告越级成长
   - `E_RULE_PLANE_LEAK`: 人界输入高位面专名
   - `E_RULE_BREAKTHROUGH_BLOCKED`: 大境界突破条件不足

2. 大境界突破流程（MVP）
   - `尝试筑基`：要求炼气后期圆满 + 灵石 >= 1000
   - `尝试结丹`：要求筑基后期圆满 + 心智 >= 20 + 灵石 >= 3000

3. 小境界自动推进
   - 已扩展到：炼气前/中/后、筑基前/中/后、结丹前/中/后

4. OpenClaw 回包增强
   - 新增 `rule_violations` 字段
   - 保留 `media` 字段用于关键剧情媒体触发

## 已接入文件
- `src/core/xianxiaValidator.ts`
- `src/core/xianxiaEngine.ts`
- `src/integrations/openclaw.ts`
