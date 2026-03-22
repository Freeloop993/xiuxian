# 游戏规则 v0.1

## 1. 核心枚举

### 1.1 时段
- `morning`
- `noon`
- `evening`
- `night`

### 1.2 动作
- `work`
- `social`
- `rest`
- `fun`
- `adventure`
- `auto` (由系统按人格与状态决策)

### 1.3 地点
- `home`
- `workshop`
- `tavern`
- `beach`
- `arena`

### 1.4 人格
- `steady` (稳健)
- `bold` (冒险)
- `social` (社交)

## 2. 状态模型

```json
{
  "day": 1,
  "timeslot": "morning",
  "location": "home",
  "persona": "steady",
  "stats": {
    "energy": 8,
    "mood": 6,
    "gold": 5,
    "social": 4,
    "explore": 4
  },
  "flags": {
    "worked_today": false,
    "socialized_today": false,
    "adventured_today": false
  }
}
```

约束：
- `energy/mood/social/explore` 取值范围 `0-10`。
- `gold` 最小 `0`。
- 每推进一次动作，只前进一个时段。
- `night` 后进入下一天 `morning`，并重置 `flags`。

## 3. 动作基础数值

### 3.1 默认数值变化
- `work`: `gold +3`, `energy -2`, `mood -1`
- `social`: `social +2`, `mood +1`, `energy -1`
- `rest`: `energy +3`, `mood +1`
- `fun`: `mood +2`, `gold -1`, `energy -1`
- `adventure`: `explore +2`, `gold +1`, `energy -2`

### 3.2 人格修正
- `steady`
  - `work` 额外 `gold +1`
  - `adventure` 额外 `mood -1`
- `bold`
  - `adventure` 额外 `explore +1`
  - `rest` 额外 `mood -1`
- `social`
  - `social` 额外 `social +1`
  - `work` 额外 `mood -1`

## 4. 意图解析规则（MVP）

输入文本解析优先级：
1. 明确关键词匹配动作。
2. 未命中则判定 `auto`。
3. 无法判定且文本为空，返回澄清，不推进时段。

关键词示例：
- `work`: 打工, 工作, 搬砖, 赚钱, 工坊
- `social`: 社交, 见朋友, 聊天, 酒馆
- `rest`: 休息, 睡觉, 躺平, 回家
- `fun`: 玩, 娱乐, 游戏, 放松
- `adventure`: 冒险, 探索, 竞技场, 海边

## 5. 事件选择规则

1. 根据动作筛选事件：`event.action == chosen_action`。
2. 再按地点筛选（若有地点条件）。
3. 再按前置条件（最小属性、flags、day 区间）。
4. 在候选池中随机选择 1 条，按权重 `weight` 抽样。

若无候选事件：
- 使用动作默认文案模板并仅应用基础数值变化。

## 6. 结局倾向计算（周维度）

统计 7 天行为：
- `work_count` 高且 `mood` 长期偏低 => `卷王`
- `fun/social` 比例高且 `gold` 低 => `享乐`
- 各动作分布均衡且 `mood` 中高 => `平衡`

## 7. OpenClaw 兼容约束

1. 每次 webhook 输入必须带 `session_id` 与 `channel_user_id`。
2. 幂等键：`channel + channel_user_id + timestamp`。
3. 处理超时上限：`8s`，超时返回兜底文本。
4. 输出必须包含：`reply_text`, `game_state`, `next_suggestions`。

## 8. 错误码（服务内）
- `E_INTENT_EMPTY`: 输入为空
- `E_INTENT_UNKNOWN`: 意图无法解析
- `E_STATE_CONFLICT`: 状态更新冲突
- `E_EVENT_NOT_FOUND`: 无匹配事件
- `E_IDEMPOTENT_DUP`: 重复消息

## 9. 测试最小用例
1. 新角色从 `day1/morning` 连续推进 4 次，进入 `day2/morning`。
2. 动作 `work` 在 `steady` 人格下金币增量大于基础值。
3. 同一幂等键重复请求，不重复结算。
4. 事件池为空时，触发默认动作文案。
