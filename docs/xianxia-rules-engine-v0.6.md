# Xianxia Rules Engine v0.6

## 新增能力
1. PostgreSQL 持久化仓储
   - 通过 `DATABASE_URL` 自动启用
   - 启动自动执行 `db/schema.sql`
   - 保存用户映射、模式、龙虾状态、修仙状态、幂等键

2. 事件终末媒体触发
   - 当事件阶段进入 `终末期` 且未触发过时，自动追加：
     `![宗派大战](https://test-cdn.fakersai.com/media/chat_history_files/c7b364f9-41f6-4290-bc19-840e93a19d91/edde1b84-2c45-4429-bf4d-8149dd5e785c.mp4)`
   - 触发一次后会在状态中标记 `finaleMediaEmitted=true`

3. 仓储抽象
   - 新增 `GameRepo` 接口
   - `InMemoryRepo` 与 `PgRepo` 统一实现
   - `repoFactory` 按环境自动选择

## 关键文件
- `src/repo/gameRepo.ts`
- `src/repo/inMemoryRepo.ts`
- `src/repo/pgRepo.ts`
- `src/repo/repoFactory.ts`
- `db/schema.sql`
- `src/integrations/openclaw.ts`
- `src/core/xianxiaEngine.ts`
- `src/core/xianxiaMedia.ts`
