# xiuxian

OpenClaw 兼容的双模式 AI 游戏后端：
- 龙虾日常模式（lobster）
- 修仙世界模式（xianxia）

项目使用 `Fastify + TypeScript`，通过 webhook 接收聊天输入并推进世界状态。

## 功能概览

1. 双模式会话
- `lobster`：工作/社交/休息/娱乐/冒险日程循环
- `xianxia`：开局问名/出身/属性分配 + 修炼、突破、飞升、事件衍化

2. 修仙规则引擎
- 结构化规则错误码（如越级宣告、位面越界、突破条件不足）
- 关键媒体触发（结丹、飞升、宗派大战终末）
- 事件五阶段演化（萌芽->发展->激化->终末->余波）
- 宗门声望与 NPC 关系系统

3. 仓储
- 默认：内存仓储（无需外部依赖）
- 可选：PostgreSQL（通过 `DATABASE_URL` 自动启用）

## 目录结构

```text
src/
  core/
  integrations/
  repo/
data/
docs/
db/
```

## 本地启动

### 1) 安装依赖

```bash
npm install
```

### 2) 启动开发服务

```bash
npm run dev
```

默认监听：`http://localhost:3000`

前端控制台：`http://localhost:3000/`

### 3) 类型检查

```bash
npm run check
```

## PostgreSQL 启用（可选）

设置环境变量 `DATABASE_URL` 后，服务会自动切换到 PG 仓储并在启动时执行 `db/schema.sql` 建表。

```bash
# Windows (cmd)
set DATABASE_URL=postgres://user:password@127.0.0.1:5432/xiuxian
npm run dev
```

更多见：[docs/postgres-setup.md](docs/postgres-setup.md)

## OpenClaw 接口

### Health

- `GET /health`

### Webhook

- `POST /webhooks/openclaw`

请求体示例：

```json
{
  "session_id": "s_001",
  "channel": "discord",
  "channel_user_id": "u_123",
  "text": "切换修仙",
  "timestamp": "2026-03-22T12:00:00.000Z"
}
```

响应核心字段：
- `reply_text`
- `game_state`
- `next_suggestions`
- `media`（修仙模式关键媒体）
- `rule_violations`（修仙模式规则错误码）
- `structured_turn`（修仙模式结构化回合结果，推荐上层优先消费）

详细协议见：[docs/api-spec-v0.1.md](docs/api-spec-v0.1.md)

## 模式切换指令

- 切到修仙：`切换修仙` 或 `/mode xianxia`
- 切到龙虾：`切换龙虾` 或 `/mode lobster`

## 修仙模式快速流程

1. 切换模式
2. 报名号
3. 选择出身（A/B/C）
4. 分配 100 点先天属性（根骨/悟性/神魂/机缘/心智）
5. 进入世界循环（闭关/坊市/探索/突破/飞升）

## 常见问题

1. `fatal: detected dubious ownership`

```bash
git config --global --add safe.directory "E:/codex code/Game"
```

2. `Authentication failed` / `403`
- 使用 GitHub PAT（不是账号密码）
- 或改用 SSH 推送

## 版本文档

- 需求与 MVP 规划：`docs/MVP_OPENCLAW_LOBSTER.md`
- 修仙规则引擎迭代：`docs/xianxia-rules-engine-v0.2.md` 到 `v0.6.md`

## License

当前仓库未附带开源许可证（`No license`）。

## OpenClaw LLM 叙事增强（推荐）

修仙模式支持直接调用 OpenClaw 的 LLM 网关增强剧情叙事（不接第三方 LLM API）。

设置以下环境变量即可启用：

```bash
OPENCLAW_LLM_URL=https://<你的-openclaw-llm-endpoint>
OPENCLAW_MODEL=<你的模型名>
OPENCLAW_API_KEY=<可选>
```

未设置 `OPENCLAW_LLM_URL` 时，系统会自动回退到规则引擎默认叙事文本。

更多见：[docs/openclaw-llm-integration.md](docs/openclaw-llm-integration.md)

## 推荐架构分层

- 后端（本项目）负责：状态持久化、数值计算、规则校验、结构化回合输出。
- OpenClaw LLM 负责：自然语言理解、叙事润色、沉浸式表达。
- `reply_text` 仅用于兼容旧调用方；新接入建议优先使用 `structured_turn` 组织回复与 UI。


## 挂机状态锁

- 发送 开始挂机2小时 进入挂机状态锁。
- 锁定期间不会推进剧情，只允许：挂机状态、领取挂机、结束挂机。
- 到时后必须先领取或结束，才可继续普通交互。



## Idle Reminder Integration

- 挂机到时可通过 OpenClaw 主动推送提醒（可选启用）。
- 配置见 [docs/idle-reminder.md](docs/idle-reminder.md)

