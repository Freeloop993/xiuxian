import events from "../../data/events.seed.json" with { type: "json" };
import type { Action, GameEvent, LobsterState, ResolveResult, Timeslot } from "./types.js";

const orderedTimeslots: Timeslot[] = ["morning", "noon", "evening", "night"];

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const keywords: Record<Exclude<Action, "auto">, string[]> = {
  work: ["打工", "工作", "搬砖", "赚钱", "工坊"],
  social: ["社交", "见朋友", "聊天", "酒馆", "聚会"],
  rest: ["休息", "睡觉", "躺平", "回家"],
  fun: ["玩", "娱乐", "游戏", "放松"],
  adventure: ["冒险", "探索", "竞技场", "海边"],
};

const defaultSuggestions = ["回家休息", "去酒馆社交", "明早去工坊打工"];

function parseAction(input: string): Action {
  const text = input.trim();
  if (!text) {
    throw new Error("E_INTENT_EMPTY");
  }

  for (const [action, list] of Object.entries(keywords) as [Exclude<Action, "auto">, string[]][]) {
    if (list.some((kw) => text.includes(kw))) {
      return action;
    }
  }

  if (text.includes("你自己") || text.includes("随便") || text.includes("自己决定")) {
    return "auto";
  }

  return "auto";
}

function resolveAutoAction(state: LobsterState): Exclude<Action, "auto"> {
  if (state.stats.energy <= 3) return "rest";
  if (state.persona === "bold") return "adventure";
  if (state.persona === "social") return "social";
  return "work";
}

function moveToLocation(action: Exclude<Action, "auto">): LobsterState["location"] {
  switch (action) {
    case "work":
      return "workshop";
    case "social":
      return "tavern";
    case "rest":
      return "home";
    case "fun":
      return "beach";
    case "adventure":
      return "arena";
    default:
      return "home";
  }
}

function baseEffects(action: Exclude<Action, "auto">): Record<string, number> {
  switch (action) {
    case "work":
      return { gold: 3, energy: -2, mood: -1 };
    case "social":
      return { social: 2, mood: 1, energy: -1 };
    case "rest":
      return { energy: 3, mood: 1 };
    case "fun":
      return { mood: 2, gold: -1, energy: -1 };
    case "adventure":
      return { explore: 2, gold: 1, energy: -2 };
  }
}

function personaEffects(state: LobsterState, action: Exclude<Action, "auto">): Record<string, number> {
  if (state.persona === "steady") {
    if (action === "work") return { gold: 1 };
    if (action === "adventure") return { mood: -1 };
  }
  if (state.persona === "bold") {
    if (action === "adventure") return { explore: 1 };
    if (action === "rest") return { mood: -1 };
  }
  if (state.persona === "social") {
    if (action === "social") return { social: 1 };
    if (action === "work") return { mood: -1 };
  }
  return {};
}

function canUseEvent(evt: GameEvent, state: LobsterState): boolean {
  if (evt.location !== state.location) return false;
  const c = evt.conditions;
  if (c.timeslot && c.timeslot !== state.timeslot) return false;
  if (c.min_energy !== undefined && state.stats.energy < c.min_energy) return false;
  if (c.min_mood !== undefined && state.stats.mood < c.min_mood) return false;
  if (c.min_gold !== undefined && state.stats.gold < c.min_gold) return false;
  if (c.min_social !== undefined && state.stats.social < c.min_social) return false;
  if (c.min_explore !== undefined && state.stats.explore < c.min_explore) return false;
  return true;
}

function pickWeighted(candidates: GameEvent[]): GameEvent | undefined {
  if (!candidates.length) return undefined;
  const total = candidates.reduce((sum, e) => sum + Math.max(1, e.weight), 0);
  let r = Math.random() * total;
  for (const evt of candidates) {
    r -= Math.max(1, evt.weight);
    if (r <= 0) return evt;
  }
  return candidates[candidates.length - 1];
}

function applyDelta(state: LobsterState, delta: Record<string, number>): void {
  state.stats.energy = clamp(state.stats.energy + (delta.energy ?? 0), 0, 10);
  state.stats.mood = clamp(state.stats.mood + (delta.mood ?? 0), 0, 10);
  state.stats.gold = Math.max(0, state.stats.gold + (delta.gold ?? 0));
  state.stats.social = clamp(state.stats.social + (delta.social ?? 0), 0, 10);
  state.stats.explore = clamp(state.stats.explore + (delta.explore ?? 0), 0, 10);
}

function advanceTimeslot(state: LobsterState): void {
  const idx = orderedTimeslots.indexOf(state.timeslot);
  const next = (idx + 1) % orderedTimeslots.length;
  state.timeslot = orderedTimeslots[next];
  if (state.timeslot === "morning") {
    state.day += 1;
    state.flags = {
      workedToday: false,
      socializedToday: false,
      adventuredToday: false,
    };
  }
}

function updateFlags(state: LobsterState, action: Exclude<Action, "auto">): void {
  if (action === "work") state.flags.workedToday = true;
  if (action === "social") state.flags.socializedToday = true;
  if (action === "adventure") state.flags.adventuredToday = true;
}

function resolveSuggestions(state: LobsterState): string[] {
  if (state.stats.energy <= 2) {
    return ["回家补觉", "喝点热汤恢复体力", "明天再去冒险"];
  }
  if (state.stats.gold <= 1) {
    return ["去工坊赚点金币", "酒馆接兼职", "先做一轮短工"];
  }
  return defaultSuggestions;
}

export function resolveTurn(current: LobsterState, userText: string): ResolveResult {
  const action = parseAction(userText);
  const finalAction = action === "auto" ? resolveAutoAction(current) : action;

  current.location = moveToLocation(finalAction);

  const allEvents = events as GameEvent[];
  const candidates = allEvents.filter((evt) => evt.action === finalAction).filter((evt) => canUseEvent(evt, current));
  const selectedEvent = pickWeighted(candidates);

  const mergedDelta: Record<string, number> = {
    ...baseEffects(finalAction),
  };

  for (const [k, v] of Object.entries(personaEffects(current, finalAction))) {
    mergedDelta[k] = (mergedDelta[k] ?? 0) + v;
  }

  if (selectedEvent) {
    for (const [k, v] of Object.entries(selectedEvent.effects)) {
      mergedDelta[k] = (mergedDelta[k] ?? 0) + (v ?? 0);
    }
  }

  applyDelta(current, mergedDelta);
  updateFlags(current, finalAction);
  advanceTimeslot(current);

  const replyText = selectedEvent
    ? `${selectedEvent.text}（${finalAction}）`
    : `你完成了${finalAction}行动，状态发生了变化。`;

  return {
    replyText,
    nextSuggestions: resolveSuggestions(current),
    state: current,
    action: finalAction,
    eventId: selectedEvent?.id,
  };
}
