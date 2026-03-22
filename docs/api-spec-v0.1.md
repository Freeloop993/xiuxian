# API Spec v0.4 (OpenClaw-Compatible)

## OpenClaw Webhook
### `POST /webhooks/openclaw`

修仙模式响应（关键字段）：
```json
{
  "reply_text": "...",
  "game_state": {
    "mode": "xianxia",
    "step": "in_world",
    "plane": "human",
    "realm": "结丹期·前期",
    "cultivation": { "current": 0, "max": 1200 },
    "law_percent": 0,
    "dao_seal_count": 0,
    "world_event": {
      "id": "evt_ancient_ruin",
      "name": "古修遗府出世",
      "stage": "终末期",
      "tension": 10,
      "finaleMediaEmitted": true
    },
    "faction_reputation": {
      "黄枫谷": 8,
      "掩月宗": 0,
      "散修盟": 12
    },
    "npc_relations": {
      "墨雨": 3,
      "叶清霜": 6
    }
  },
  "media": ["![宗派大战](https://test-cdn.fakersai.com/media/chat_history_files/c7b364f9-41f6-4290-bc19-840e93a19d91/edde1b84-2c45-4429-bf4d-8149dd5e785c.mp4)"],
  "rule_violations": [],
  "next_suggestions": ["继续闭关", "回坊市"]
}
```

## 仓储模式
- 未设置 `DATABASE_URL`：内存仓储
- 设置 `DATABASE_URL`：PostgreSQL 仓储（自动建表）

## 跨平台账号互通

默认按 `channel + channel_user_id` 识别用户，不同平台会被视为不同角色。

现在已支持全局用户映射：
- webhook 请求里传 `global_user_id`（推荐）
- 或传 `user_id`

当这两个字段任一存在时，系统会优先按全局ID合并用户，从而实现飞书/微信/QQ同一存档。

请求示例：

```json
{
  "session_id": "s_001",
  "channel": "feishu",
  "channel_user_id": "ou_xxx",
  "global_user_id": "u_10086",
  "text": "继续修炼",
  "timestamp": "2026-03-22T12:00:00.000Z"
}
```
