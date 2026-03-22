# Xianxia Rules Engine v0.5

## 新增系统
1. 事件衍化系统（五阶段）
   - 阶段：萌芽期 -> 发展期 -> 激化期 -> 终末期 -> 余波期
   - 事件张力 `tension` 随行为推进，阶段自动跃迁

2. 宗门声望系统
   - 当前接入势力：黄枫谷、掩月宗、散修盟
   - 不同行为对声望产生增减（坊市、历练、突破）

3. NPC 关系系统
   - 当前接入：墨雨、叶清霜
   - 关系值范围：-100 ~ 100
   - 自动映射关系等级（中立/友善/信赖等）并写入关系摘要

## 引擎接入
- 每回合结算后调用 `xianxiaWorld.evolveWorld(...)`
- 叙事中追加世界演化日志
- webhook 返回结构增加：
  - `game_state.world_event`
  - `game_state.faction_reputation`
  - `game_state.npc_relations`

## 代码文件
- `src/core/xianxiaWorld.ts`
- `src/core/xianxiaEngine.ts`
- `src/core/types.ts`
- `src/repo/inMemoryRepo.ts`
- `src/integrations/openclaw.ts`
