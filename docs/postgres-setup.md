# PostgreSQL Setup (v0.6)

## 启用方式
默认使用内存仓储。

当设置 `DATABASE_URL` 后，服务会自动切换到 PostgreSQL 仓储并在启动时执行建表 SQL。

示例：
```bash
set DATABASE_URL=postgres://user:password@127.0.0.1:5432/lobster_game
npm run dev
```

## 建表文件
- `db/schema.sql`

包含表：
1. `users`
2. `user_identities`
3. `user_modes`
4. `lobster_states`
5. `xianxia_states`
6. `idempotency_keys`

## 当前持久化范围
1. 用户身份映射（渠道用户 -> 内部 user）
2. 模式状态（lobster/xianxia）
3. 龙虾状态 JSON
4. 修仙状态 JSON（含事件衍化、声望、关系）
5. 幂等键
