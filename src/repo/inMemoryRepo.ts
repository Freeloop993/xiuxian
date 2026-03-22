import { randomUUID } from "node:crypto";
import type { GameMode, LobsterState, Persona, XianxiaState } from "../core/types.js";
import type { GameRepo, SessionIdentity } from "./gameRepo.js";

const identityKey = (identity: SessionIdentity): string => `${identity.channel}:${identity.channelUserId}`;

export class InMemoryRepo implements GameRepo {
  private userByIdentity = new Map<string, string>();
  private stateByUser = new Map<string, LobsterState>();
  private xianxiaStateByUser = new Map<string, XianxiaState>();
  private modeByUser = new Map<string, GameMode>();
  private idempotentSet = new Set<string>();

  async init(): Promise<void> {}

  async getOrCreateUser(identity: SessionIdentity): Promise<string> {
    const key = identityKey(identity);
    const existing = this.userByIdentity.get(key);
    if (existing) return existing;

    const userId = randomUUID();
    this.userByIdentity.set(key, userId);
    this.modeByUser.set(userId, "lobster");
    return userId;
  }

  async getMode(userId: string): Promise<GameMode> {
    return this.modeByUser.get(userId) ?? "lobster";
  }

  async setMode(userId: string, mode: GameMode): Promise<void> {
    this.modeByUser.set(userId, mode);
  }

  async getState(userId: string): Promise<LobsterState | undefined> {
    return this.stateByUser.get(userId);
  }

  async createDefaultState(userId: string, persona: Persona = "steady"): Promise<LobsterState> {
    const state: LobsterState = {
      userId,
      lobsterId: randomUUID(),
      day: 1,
      timeslot: "morning",
      location: "home",
      persona,
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
    this.stateByUser.set(userId, state);
    return state;
  }

  async saveState(state: LobsterState): Promise<void> {
    this.stateByUser.set(state.userId, state);
  }

  async getXianxiaState(userId: string): Promise<XianxiaState | undefined> {
    return this.xianxiaStateByUser.get(userId);
  }

  async createDefaultXianxiaState(userId: string): Promise<XianxiaState> {
    const state: XianxiaState = {
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
    this.xianxiaStateByUser.set(userId, state);
    return state;
  }

  async saveXianxiaState(state: XianxiaState): Promise<void> {
    this.xianxiaStateByUser.set(state.userId, state);
  }

  async isDuplicate(key: string): Promise<boolean> {
    return this.idempotentSet.has(key);
  }

  async rememberRequest(key: string): Promise<void> {
    this.idempotentSet.add(key);
  }
}
