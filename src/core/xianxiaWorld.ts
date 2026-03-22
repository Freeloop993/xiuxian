import type { XianxiaState } from "./types.js";

type ActionTag = "cultivate" | "market" | "explore" | "breakthrough" | "social";

function stageFromTension(tension: number): XianxiaState["worldEvent"]["stage"] {
  if (tension >= 12) return "余波期";
  if (tension >= 9) return "终末期";
  if (tension >= 6) return "激化期";
  if (tension >= 3) return "发展期";
  return "萌芽期";
}

function relationRank(v: number): string {
  if (v <= -51) return "死敌";
  if (v <= -11) return "敌对";
  if (v <= 10) return "中立";
  if (v <= 50) return "友善";
  if (v <= 90) return "信赖";
  return "知己";
}

function clampRep(v: number): number {
  return Math.max(-1000, Math.min(1000, v));
}

function clampRel(v: number): number {
  return Math.max(-100, Math.min(100, v));
}

function setRep(state: XianxiaState, faction: string, delta: number): void {
  state.factionReputation[faction] = clampRep((state.factionReputation[faction] ?? 0) + delta);
}

function setRel(state: XianxiaState, npc: string, delta: number): void {
  state.npcRelations[npc] = clampRel((state.npcRelations[npc] ?? 0) + delta);
}

function buildRelationSummary(state: XianxiaState): string {
  const npcChunks = Object.entries(state.npcRelations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name, val]) => `[${name}] (${relationRank(val)} ${val})`)
    .join("，");

  return `[道侣] 无 ([0]), [灵兽] ${state.beastName} ([羁绊: ${state.beastStage}(0/100)]), [NPC] ${npcChunks || "无"}`;
}

function buildFactionDigest(state: XianxiaState): string {
  return Object.entries(state.factionReputation)
    .map(([k, v]) => `${k}:${v}`)
    .join(" / ");
}

export function evolveWorld(state: XianxiaState, action: ActionTag): string[] {
  const logs: string[] = [];

  const deltaByAction: Record<ActionTag, number> = {
    cultivate: 1,
    market: 1,
    explore: 2,
    breakthrough: 3,
    social: 1,
  };

  state.worldEvent.tension += deltaByAction[action];
  const nextStage = stageFromTension(state.worldEvent.tension);
  if (nextStage !== state.worldEvent.stage) {
    state.worldEvent.stage = nextStage;
    logs.push(`事件【${state.worldEvent.name}】进入${nextStage}。`);
  }

  if (action === "market") {
    setRep(state, "黄枫谷", 3);
    setRel(state, "墨雨", 2);
  }

  if (action === "explore") {
    setRep(state, "散修盟", 4);
    setRel(state, "叶清霜", 2);
  }

  if (action === "breakthrough") {
    setRep(state, "黄枫谷", 8);
    setRel(state, "墨雨", 3);
  }

  if (action === "cultivate") {
    setRel(state, "墨雨", 1);
  }

  state.relationSummary = buildRelationSummary(state);
  logs.push(`宗门声望：${buildFactionDigest(state)}`);

  return logs;
}

export function detectActionTag(text: string, usedMajorBreakthrough: boolean): ActionTag {
  if (usedMajorBreakthrough) return "breakthrough";
  if (text.includes("坊市") || text.includes("购买") || text.includes("交易")) return "market";
  if (text.includes("探索") || text.includes("历练") || text.includes("外出")) return "explore";
  if (text.includes("社交") || text.includes("拜访")) return "social";
  return "cultivate";
}
