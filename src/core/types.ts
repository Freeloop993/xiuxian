export type Channel = "discord" | "telegram" | "whatsapp" | "imessage" | "other";
export type GameMode = "lobster" | "xianxia";
export type XianxiaPlane = "human" | "spirit" | "immortal";
export type Timeslot = "morning" | "noon" | "evening" | "night";
export type Action = "work" | "social" | "rest" | "fun" | "adventure" | "auto";
export type Persona = "steady" | "bold" | "social";
export type Location = "home" | "workshop" | "tavern" | "beach" | "arena";

export interface Stats {
  energy: number;
  mood: number;
  gold: number;
  social: number;
  explore: number;
}

export interface LobsterState {
  userId: string;
  lobsterId: string;
  day: number;
  timeslot: Timeslot;
  location: Location;
  persona: Persona;
  stats: Stats;
  flags: {
    workedToday: boolean;
    socializedToday: boolean;
    adventuredToday: boolean;
  };
}

export interface XianxiaAttributes {
  physique: number;
  comprehension: number;
  soul: number;
  fortune: number;
  willpower: number;
}

export interface XianxiaState {
  userId: string;
  plane: XianxiaPlane;
  step: "ask_name" | "ask_origin" | "ask_attr" | "in_world";
  name: string;
  origin: "A" | "B" | "C" | null;
  realm: string;
  bodyRealm: string;
  soulRealm: string;
  cultivationCurrent: number;
  cultivationMax: number;
  attributes: XianxiaAttributes | null;
  spiritStone: number;
  immortalStone: number;
  hp: number;
  mp: number;
  lawPercent: number;
  daoSealCount: number;
  foundationPill: number;
  insightRelic: number;
  spiritEyeAccess: boolean;
  goal: string;
  shaQi: number;
  beastName: string;
  beastStage: string;
  beastLevel: number;
  relationSummary: string;
  worldEvent: {
    id: string;
    name: string;
    stage: "萌芽期" | "发展期" | "激化期" | "终末期" | "余波期";
    tension: number;
    finaleMediaEmitted: boolean;
  };
  factionReputation: Record<string, number>;
  npcRelations: Record<string, number>;
}

export interface OpenClawInbound {
  session_id: string;
  channel: Channel;
  channel_user_id: string;
  text: string;
  timestamp: string;
}

export interface GameEvent {
  id: string;
  action: Exclude<Action, "auto">;
  location: Location;
  weight: number;
  conditions: {
    min_energy?: number;
    min_mood?: number;
    min_gold?: number;
    min_social?: number;
    min_explore?: number;
    timeslot?: Timeslot;
  };
  effects: Partial<Stats>;
  text: string;
}

export interface ResolveResult {
  replyText: string;
  nextSuggestions: string[];
  state: LobsterState;
  action: Exclude<Action, "auto">;
  eventId?: string;
}

export interface RuleViolation {
  code: "E_RULE_REALM_CHEAT" | "E_RULE_PLANE_LEAK" | "E_RULE_BREAKTHROUGH_BLOCKED";
  message: string;
}

export interface XianxiaResolveResult {
  replyText: string;
  nextSuggestions: string[];
  state: XianxiaState;
  media: string[];
  violations: RuleViolation[];
}
