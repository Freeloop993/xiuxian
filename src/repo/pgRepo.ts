import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import type { GameMode, LobsterState, XianxiaState } from "../core/types.js";
import type { GameRepo, SessionIdentity } from "./gameRepo.js";

function defaultXianxiaState(userId: string): XianxiaState {
  return {
    userId,
    plane: "human",
    step: "ask_name",
    name: "未名修行者",
    origin: null,
    realm: "炼气期·前期",
    bodyRealm: "凡胎之躯",
    soulRealm: "凡境",
    cultivationCurrent: 0,
    cultivationMax: 96,
    attributes: null,
    spiritStone: 120,
    immortalStone: 0,
    hp: 100,
    mp: 100,
    lawPercent: 0,
    daoSealCount: 0,
    foundationPill: 0,
    insightRelic: 0,
    spiritEyeAccess: false,
    goal: "[全新开局]",
    shaQi: 0,
    beastName: "无",
    beastStage: "无",
    beastLevel: 0,
    relationSummary: "[道侣] 无 ([0]), [灵兽] 无 ([羁绊: 无(0/100)])",
    worldEvent: {
      id: "evt_ancient_ruin",
      name: "古修遗府出世",
      stage: "萌芽期",
      tension: 0,
      finaleMediaEmitted: false,
    },
    factionReputation: {
      黄枫谷: 0,
      掩月宗: 0,
      散修盟: 0,
    },
    npcRelations: {
      墨雨: 0,
      叶清霜: 0,
    },
  };
}

function defaultLobsterState(userId: string): LobsterState {
  return {
    userId,
    lobsterId: randomUUID(),
    day: 1,
    timeslot: "morning",
    location: "home",
    persona: "steady",
    stats: {
      energy: 8,
      mood: 6,
      gold: 5,
      social: 4,
      explore: 4,
    },
    flags: {
      workedToday: false,
      socializedToday: false,
      adventuredToday: false,
    },
  };
}

export class PgRepo implements GameRepo {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async init(): Promise<void> {
    const schemaPath = join(process.cwd(), "db", "schema.sql");
    const sql = readFileSync(schemaPath, "utf8");
    await this.pool.query(sql);
  }

  async getOrCreateUser(identity: SessionIdentity): Promise<string> {
    const found = await this.pool.query<{ user_id: string }>(
      "SELECT user_id FROM user_identities WHERE channel = $1 AND channel_user_id = $2",
      [identity.channel, identity.channelUserId],
    );
    if (found.rowCount && found.rows[0]) return found.rows[0].user_id;

    const userId = randomUUID();
    await this.pool.query("INSERT INTO users(id) VALUES($1)", [userId]);
    await this.pool.query("INSERT INTO user_identities(channel, channel_user_id, user_id) VALUES($1,$2,$3)", [
      identity.channel,
      identity.channelUserId,
      userId,
    ]);
    await this.pool.query("INSERT INTO user_modes(user_id, mode) VALUES($1, 'lobster')", [userId]);
    return userId;
  }

  async getMode(userId: string): Promise<GameMode> {
    const res = await this.pool.query<{ mode: GameMode }>("SELECT mode FROM user_modes WHERE user_id = $1", [userId]);
    return res.rowCount && res.rows[0] ? res.rows[0].mode : "lobster";
  }

  async setMode(userId: string, mode: GameMode): Promise<void> {
    await this.pool.query(
      "INSERT INTO user_modes(user_id, mode) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW()",
      [userId, mode],
    );
  }

  async getState(userId: string): Promise<LobsterState | undefined> {
    const res = await this.pool.query<{ state: LobsterState }>("SELECT state FROM lobster_states WHERE user_id = $1", [userId]);
    return res.rowCount && res.rows[0] ? (res.rows[0].state as LobsterState) : undefined;
  }

  async createDefaultState(userId: string): Promise<LobsterState> {
    const state = defaultLobsterState(userId);
    await this.saveState(state);
    return state;
  }

  async saveState(state: LobsterState): Promise<void> {
    await this.pool.query(
      "INSERT INTO lobster_states(user_id, state) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()",
      [state.userId, JSON.stringify(state)],
    );
  }

  async getXianxiaState(userId: string): Promise<XianxiaState | undefined> {
    const res = await this.pool.query<{ state: XianxiaState }>("SELECT state FROM xianxia_states WHERE user_id = $1", [userId]);
    return res.rowCount && res.rows[0] ? (res.rows[0].state as XianxiaState) : undefined;
  }

  async createDefaultXianxiaState(userId: string): Promise<XianxiaState> {
    const state = defaultXianxiaState(userId);
    await this.saveXianxiaState(state);
    return state;
  }

  async saveXianxiaState(state: XianxiaState): Promise<void> {
    await this.pool.query(
      "INSERT INTO xianxia_states(user_id, state) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()",
      [state.userId, JSON.stringify(state)],
    );
  }

  async isDuplicate(key: string): Promise<boolean> {
    const res = await this.pool.query("SELECT 1 FROM idempotency_keys WHERE idempotency_key = $1", [key]);
    return (res.rowCount ?? 0) > 0;
  }

  async rememberRequest(key: string): Promise<void> {
    await this.pool.query("INSERT INTO idempotency_keys(idempotency_key) VALUES($1) ON CONFLICT DO NOTHING", [key]);
  }
}
