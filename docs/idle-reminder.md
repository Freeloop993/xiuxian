# Idle Reminder Integration

## 功能

1. 挂机状态锁
- `开始挂机X小时/分钟` 后进入锁定。
- 锁定期间仅允许：`挂机状态`、`领取挂机`、`结束挂机`。

2. 到时主动提醒（可选启用）
- 后台每隔一段时间扫描已到时挂机。
- 通过 OpenClaw 主动推送：
  - `你在【挂机历练】中的历练已完成，可发送“领取挂机”结算收益。`
- 同一轮挂机只提醒一次（`idle.reminderSentAt` 防重）。

## 环境变量

```bash
OPENCLAW_IDLE_REMINDER_ENABLED=1
OPENCLAW_IDLE_REMINDER_INTERVAL_MS=60000
OPENCLAW_PUSH_URL=https://<你的-openclaw-主动消息-endpoint>
OPENCLAW_API_KEY=<可选，若 push 端点需要鉴权>
```

说明：
- 未设置 `OPENCLAW_PUSH_URL` 时，提醒任务会跳过实际推送。
- 提醒循环在服务启动时自动启动。

## 代码位置
- `src/integrations/idleReminder.ts`
- `src/integrations/openclawPush.ts`
- `src/integrations/openclaw.ts`
