# Xianxia Rules Engine v0.4

## 新增能力
1. 飞升链路（可执行）
   - 人界：`化神期·后期圆满` 后可 `尝试飞升` -> 灵界 `炼虚期·前期`
   - 灵界：`大乘期·后期圆满` 后可 `尝试飞升` -> 仙界 `真仙·初期`

2. 关键媒体触发
   - 结丹成功：自动追加 `![结丹成功](...)`
   - 飞升灵界：自动追加 `![飞升灵界](...)`
   - 飞升仙界：自动追加 `![飞升仙界](...)`
   - 大乘、凝印触发媒体也已接入

3. 突破阶段扩展
   - 人界支持到 `化神期·后期`
   - 灵界支持到 `大乘期·后期`
   - 仙界支持法则参悟与 `尝试凝印`

4. 资源与条件化突破
   - `尝试筑基` 需筑基丹
   - `尝试结丹` 需心智与灵石
   - `尝试元婴` 需通天灵眼资格
   - `尝试化神` 需悟道之物

5. 状态字段扩展
   - `law_percent`
   - `dao_seal_count`
   - `immortalStone`
   - 特殊资源：`foundationPill`、`insightRelic`、`spiritEyeAccess`

## 主要文件
- `src/core/xianxiaEngine.ts`
- `src/core/xianxiaMedia.ts`
- `src/core/xianxiaValidator.ts`
- `src/integrations/openclaw.ts`
- `src/core/types.ts`
