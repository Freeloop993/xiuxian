import type { Channel, GameMode, LobsterState, XianxiaState } from "../core/types.js";

export interface SessionIdentity {
  channel: Channel;
  channelUserId: string;
}

export interface GameRepo {
  init(): Promise<void>;
  getOrCreateUser(identity: SessionIdentity): Promise<string>;
  getMode(userId: string): Promise<GameMode>;
  setMode(userId: string, mode: GameMode): Promise<void>;

  getState(userId: string): Promise<LobsterState | undefined>;
  createDefaultState(userId: string): Promise<LobsterState>;
  saveState(state: LobsterState): Promise<void>;

  getXianxiaState(userId: string): Promise<XianxiaState | undefined>;
  createDefaultXianxiaState(userId: string): Promise<XianxiaState>;
  saveXianxiaState(state: XianxiaState): Promise<void>;

  isDuplicate(key: string): Promise<boolean>;
  rememberRequest(key: string): Promise<void>;
}
