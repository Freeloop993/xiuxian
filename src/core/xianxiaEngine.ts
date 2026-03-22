import type {
  RuleViolation,
  XianxiaResolveResult,
  XianxiaAttributes,
  XianxiaPlane,
  XianxiaState,
  XianxiaStructuredTurn,
  XianxiaTurnEffect,
  XianxiaUiHints,
  XianxiaWorldChange,
} from "./types.js";
import { guardXianxiaReply } from "./xianxiaGuard.js";
import { appendMedia, MEDIA } from "./xianxiaMedia.js";
import { blockedBreakthrough, validatePlayerInput } from "./xianxiaValidator.js";
import { detectActionTag, evolveWorld } from "./xianxiaWorld.js";

interface RealmStage {
  realm: string;
  max: number;
}

const stageByPlane: Record<Exclude<XianxiaPlane, "immortal">, RealmStage[]> = {
  human: [
    { realm: "炼气期·前期", max: 96 },
    { realm: "炼气期·中期", max: 120 },
    { realm: "炼气期·后期", max: 216 },
    { realm: "筑基期·前期", max: 288 },
    { realm: "筑基期·中期", max: 540 },
    { realm: "筑基期·后期", max: 912 },
    { realm: "结丹期·前期", max: 1200 },
    { realm: "结丹期·中期", max: 2160 },
    { realm: "结丹期·后期", max: 2880 },
    { realm: "元婴期·前期", max: 3600 },
    { realm: "元婴期·中期", max: 4200 },
    { realm: "元婴期·后期", max: 4560 },
    { realm: "化神期·前期", max: 6000 },
    { realm: "化神期·中期", max: 7200 },
    { realm: "化神期·后期", max: 8400 },
  ],
  spirit: [
    { realm: "炼虚期·前期", max: 10000 },
    { realm: "炼虚期·中期", max: 15000 },
    { realm: "炼虚期·后期", max: 20000 },
    { realm: "合体期·前期", max: 25000 },
    { realm: "合体期·中期", max: 35000 },
    { realm: "合体期·后期", max: 50000 },
    { realm: "大乘期·前期", max: 60000 },
    { realm: "大乘期·中期", max: 80000 },
    { realm: "大乘期·后期", max: 100000 },
  ],
};

function parseOrigin(text: string): "A" | "B" | "C" | null {
  if (text.includes("A") || text.includes("天南") || text.includes("山村")) return "A";
  if (text.includes("B") || text.includes("乱星") || text.includes("渔村")) return "B";
  if (text.includes("C") || text.includes("大晋") || text.includes("世家")) return "C";
  return null;
}

function parseAvatarSelection(input: string): "male" | "female" | "custom" | null {
  if (input.includes("选择男修") || input.includes("男角色") || input.includes("男修")) return "male";
  if (input.includes("选择女修") || input.includes("女角色") || input.includes("女修")) return "female";
  if (input.includes("自定义立绘") || input.includes("上传立绘")) return "custom";
  return null;
}

function normalizeNaturalInput(rawInput: string): string {
  let input = rawInput.trim();
  if (!input) return input;

  const map: Array<{ reg: RegExp; to: string }> = [
    { reg: /(打坐|冥想|修炼一会|闭关一会|先修炼|吐纳)/, to: "闭关修炼" },
    { reg: /(逛坊市|去集市|去市场|买材料|采购)/, to: "去坊市" },
    { reg: /(出门历练|出去探险|外出冒险|去野外|打怪)/, to: "外出探索" },
    { reg: /(炼丹|练丹|炼制丹药|做丹药).*纳气/, to: "炼制纳气丹" },
    { reg: /(炼丹|练丹|炼制丹药|做丹药).*(回春|回血|疗伤)/, to: "炼制回春丹" },
    { reg: /(炼丹|练丹|炼制丹药|做丹药).*(凝神|回蓝|回法|专注)/, to: "炼制凝神丹" },
    { reg: /(吃|嗑|服).*(纳气丹|修为丹)/, to: "服用纳气丹" },
    { reg: /(吃|嗑|服).*(回春丹|回血丹|疗伤丹)/, to: "服用回春丹" },
    { reg: /(吃|嗑|服).*(凝神丹|回蓝丹|回法丹|专注丹)/, to: "服用凝神丹" },
    { reg: /(我要男|男主|男角色|选男|男修)/, to: "选择男修" },
    { reg: /(我要女|女主|女角色|选女|女修)/, to: "选择女修" },
  ];

  for (const rule of map) {
    if (rule.reg.test(input)) {
      input = rule.to;
      break;
    }
  }
  return input;
}

function parseAttributes(text: string): XianxiaAttributes | null {
  const normalized = text.replace(/，/g, ",");
  const keyMap: Record<string, keyof XianxiaAttributes> = {
    根骨: "physique",
    悟性: "comprehension",
    神魂: "soul",
    机缘: "fortune",
    心智: "willpower",
  };

  const picked = new Map<keyof XianxiaAttributes, number>();
  const seenCn = new Set<string>();
  const reg = /(根骨|悟性|神魂|机缘|心智)\s*(?:[:：=]?\s*)(\d{1,3})/g;
  let match: RegExpExecArray | null;

  while ((match = reg.exec(normalized)) !== null) {
    const cn = match[1];
    const val = Number(match[2]);
    if (seenCn.has(cn)) return null;
    seenCn.add(cn);
    picked.set(keyMap[cn], val);
  }

  if (picked.size !== 5) return null;
  const attrs: XianxiaAttributes = {
    physique: picked.get("physique") ?? 0,
    comprehension: picked.get("comprehension") ?? 0,
    soul: picked.get("soul") ?? 0,
    fortune: picked.get("fortune") ?? 0,
    willpower: picked.get("willpower") ?? 0,
  };
  const total = Object.values(attrs).reduce((sum, n) => sum + n, 0);
  if (total !== 100) return null;
  return attrs;
}

function getStages(state: XianxiaState): RealmStage[] {
  return state.plane === "human" ? stageByPlane.human : stageByPlane.spirit;
}

function findStageIndex(state: XianxiaState): number {
  const stages = getStages(state);
  const idx = stages.findIndex((s) => s.realm === state.realm);
  return idx < 0 ? 0 : idx;
}

function applyStage(state: XianxiaState, index: number): void {
  const stages = getStages(state);
  const safe = Math.max(0, Math.min(index, stages.length - 1));
  state.realm = stages[safe].realm;
  state.cultivationMax = stages[safe].max;
}

function advanceSmallStages(state: XianxiaState): string[] {
  if (state.plane === "immortal") return [];

  const logs: string[] = [];
  while (state.cultivationCurrent >= state.cultivationMax) {
    const stages = getStages(state);
    const idx = findStageIndex(state);
    const next = idx + 1;

    if (next >= stages.length) {
      state.cultivationCurrent = state.cultivationMax;
      logs.push("当前真元已达位面上限，需准备飞升。仙途未止。");
      break;
    }

    const crossMajor = stages[idx].realm.split("·")[0] !== stages[next].realm.split("·")[0];
    if (crossMajor) break;

    state.cultivationCurrent -= state.cultivationMax;
    applyStage(state, next);
    logs.push(`真元贯通周天，境界提升至**${state.realm}**。`);
  }

  return logs;
}

function applyPotionCommand(state: XianxiaState, input: string): string | null {
  const rollQuality = (): "凡品" | "良品" | "上品" => {
    const bonus = Math.floor(((state.attributes?.comprehension ?? 20) + (state.attributes?.fortune ?? 20)) / 20);
    const r = Math.random() * 100 + bonus * 2;
    if (r >= 90) return "上品";
    if (r >= 55) return "良品";
    return "凡品";
  };
  const toxicityDeltaByQuality: Record<"凡品" | "良品" | "上品", number> = {
    凡品: 8,
    良品: 4,
    上品: 1,
  };
  const gainMulByQuality: Record<"凡品" | "良品" | "上品", number> = {
    凡品: 1,
    良品: 1.2,
    上品: 1.45,
  };

  if (input.includes("炼制纳气丹")) {
    if (state.spiritStone < 30) return "炼制失败：灵石不足（需要30）。";
    state.spiritStone -= 30;
    const q = rollQuality();
    state.lastPillQuality = q;
    state.pills.nourishQi += q === "上品" ? 2 : 1;
    return `丹火一转，炼成${q}纳气丹。`;
  }

  if (input.includes("炼制回春丹")) {
    if (state.spiritStone < 40) return "炼制失败：灵石不足（需要40）。";
    state.spiritStone -= 40;
    const q = rollQuality();
    state.lastPillQuality = q;
    state.pills.heal += q === "上品" ? 2 : 1;
    return `药香凝而不散，炼成${q}回春丹。`;
  }

  if (input.includes("炼制凝神丹")) {
    if (state.spiritStone < 60) return "炼制失败：灵石不足（需要60）。";
    state.spiritStone -= 60;
    const q = rollQuality();
    state.lastPillQuality = q;
    state.pills.focus += 1;
    return `神识微震，炼成${q}凝神丹。`;
  }

  if (input.includes("服用纳气丹")) {
    if (state.pills.nourishQi < 1) return "服用失败：纳气丹不足。";
    state.pills.nourishQi -= 1;
    const quality = state.lastPillQuality === "无" ? "凡品" : state.lastPillQuality;
    const gain = Math.floor((24 + Math.floor((state.attributes?.comprehension ?? 20) / 5)) * gainMulByQuality[quality]);
    state.cultivationCurrent += gain;
    state.pillToxicity = Math.min(120, state.pillToxicity + toxicityDeltaByQuality[quality]);
    const logs = advanceSmallStages(state);
    return `丹力化开（${quality}），真元 +${gain}。${logs.join(" ")}`.trim();
  }

  if (input.includes("服用回春丹")) {
    if (state.pills.heal < 1) return "服用失败：回春丹不足。";
    state.pills.heal -= 1;
    const quality = state.lastPillQuality === "无" ? "凡品" : state.lastPillQuality;
    const heal = Math.floor(30 * gainMulByQuality[quality]);
    state.hp = Math.min(100, state.hp + heal);
    state.pillToxicity = Math.min(120, state.pillToxicity + toxicityDeltaByQuality[quality]);
    return `药力温养经脉（${quality}），气血恢复 ${heal}。`;
  }

  if (input.includes("服用凝神丹")) {
    if (state.pills.focus < 1) return "服用失败：凝神丹不足。";
    state.pills.focus -= 1;
    const quality = state.lastPillQuality === "无" ? "凡品" : state.lastPillQuality;
    const turns = quality === "上品" ? 5 : quality === "良品" ? 4 : 3;
    state.focusBuffTurns = Math.max(state.focusBuffTurns, turns);
    state.pillToxicity = Math.min(120, state.pillToxicity + toxicityDeltaByQuality[quality]);
    return `识海清明（${quality}），获得${turns}回合凝神修炼加成。`;
  }

  return null;
}

function itemLine(state: XianxiaState): string {
  return getInventoryItemsFromState(state).join(", ");
}

export function getInventoryItemsFromState(state: XianxiaState): string[] {
  const parts = ["低阶纳气丹 x2", "粗制匕首 x1"];
  if (state.foundationPill > 0) parts.push(`筑基丹 x${state.foundationPill}`);
  if (state.insightRelic > 0) parts.push(`悟道之物 x${state.insightRelic}`);
  if (state.spiritEyeAccess) parts.push("通天灵眼令牌 x1");
  if (state.pills.nourishQi > 0) parts.push(`纳气丹 x${state.pills.nourishQi}`);
  if (state.pills.heal > 0) parts.push(`回春丹 x${state.pills.heal}`);
  if (state.pills.focus > 0) parts.push(`凝神丹 x${state.pills.focus}`);
  return parts;
}

function formatIdleRemainMs(ms: number): string {
  if (ms <= 0) return "0分钟";
  const totalMin = Math.ceil(ms / (60 * 1000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

function cultivationLine(state: XianxiaState): string {
  if (state.plane === "immortal") {
    return `法则: 时空(${state.lawPercent}%)`;
  }
  return `真元: ${state.cultivationCurrent}/${state.cultivationMax}`;
}

function buildStatusIni(state: XianxiaState): string {
  const x = state.attributes;
  const attrLine = x
    ? `根骨${x.physique}/悟性${x.comprehension}/神魂${x.soul}/机缘${x.fortune}/心智${x.willpower}`
    : "待分配";
  const avatar = state.avatar.preset === null ? "未选择" : state.avatar.preset;
  const buffLine = state.focusBuffTurns > 0 ? `凝神加成(${state.focusBuffTurns}回合)` : "无";
  const toxLevel = state.pillToxicity >= 80 ? "高" : state.pillToxicity >= 40 ? "中" : "低";

  return [
    "```ini",
    "[修行者状态]",
    `📜 名  号 : ${state.name}`,
    `👤 立  绘 : ${avatar}`,
    `⛰️ 境  界 : ${state.realm}`,
    `💪 肉  身 : ${state.bodyRealm}`,
    `🧠 神  识 : ${state.soulRealm} (无)`,
    `✨ 修  为 : ${cultivationLine(state)}`,
    `💎 道  印 : ${state.daoSealCount > 0 ? `${state.daoSealCount} 枚` : "暂无"}`,
    "📖 功  法 : 青元纳气诀, 无",
    `🏺 物  品 : ${itemLine(state)}`,
    `💊 丹  药 : 纳气丹(${state.pills.nourishQi})/回春丹(${state.pills.heal})/凝神丹(${state.pills.focus})`,
    `🧪 品  质 : ${state.lastPillQuality}`,
    `☣️ 丹  毒 : ${state.pillToxicity}/100 (${toxLevel})`,
    `🔮 丹  效 : ${buffLine}`,
    `💰 资  产 : 灵石 ${state.spiritStone} / 仙元石 ${state.immortalStone}`,
    `❤️ 状  态 : HP ${state.hp}/100, MP ${state.mp}/100, 健康`,
    `💀 煞  气 : ${state.shaQi} (轻微)`,
    `🎯 目  标 : ${state.goal}`,
    `🐾 灵  兽 : ${state.beastName} ([状态: ${state.beastStage}], [等级: ${state.beastLevel}])`,
    `🔗 关  系 : ${state.relationSummary}`,
    `🧬 先  天 : ${attrLine}`,
    "```",
  ].join("\n");
}

function cloneState(state: XianxiaState): XianxiaState {
  return JSON.parse(JSON.stringify(state)) as XianxiaState;
}

function summarizeEffects(before: XianxiaState, after: XianxiaState): XianxiaTurnEffect[] {
  const effects: XianxiaTurnEffect[] = [];
  const pushIfChanged = (key: string, label: string, b: string | number | boolean | null, a: string | number | boolean | null): void => {
    if (b === a) return;
    effects.push({ key, label, before: b, after: a });
  };

  pushIfChanged("name", "名号", before.name, after.name);
  pushIfChanged("step", "流程阶段", before.step, after.step);
  pushIfChanged("origin", "出身", before.origin, after.origin);
  pushIfChanged("plane", "位面", before.plane, after.plane);
  pushIfChanged("realm", "境界", before.realm, after.realm);
  pushIfChanged("goal", "目标", before.goal, after.goal);
  pushIfChanged("spiritStone", "灵石", before.spiritStone, after.spiritStone);
  pushIfChanged("hp", "生命", before.hp, after.hp);
  pushIfChanged("mp", "法力", before.mp, after.mp);
  pushIfChanged("avatar", "立绘", before.avatar.preset, after.avatar.preset);
  pushIfChanged("pill.nourishQi", "纳气丹", before.pills.nourishQi, after.pills.nourishQi);
  pushIfChanged("pill.heal", "回春丹", before.pills.heal, after.pills.heal);
  pushIfChanged("pill.focus", "凝神丹", before.pills.focus, after.pills.focus);
  pushIfChanged("focusBuffTurns", "凝神回合", before.focusBuffTurns, after.focusBuffTurns);

  return effects;
}

function summarizeWorldChanges(before: XianxiaState, after: XianxiaState): XianxiaWorldChange[] {
  const changes: XianxiaWorldChange[] = [];
  if (before.worldEvent.stage !== after.worldEvent.stage) {
    changes.push({ key: "world.stage", label: "世界事件阶段", value: `${before.worldEvent.stage} -> ${after.worldEvent.stage}` });
  }
  if (before.worldEvent.tension !== after.worldEvent.tension) {
    changes.push({ key: "world.tension", label: "世界张力", value: `${before.worldEvent.tension} -> ${after.worldEvent.tension}` });
  }
  return changes;
}

function detectUiHints(state: XianxiaState): XianxiaUiHints {
  if (state.step === "ask_name") {
    return { input_expected: "请输入名号（可先选立绘）", input_examples: ["选择男修", "选择女修", "韩立"] };
  }
  if (state.step === "ask_origin") {
    return { input_expected: "请输入出身选项 A/B/C", input_examples: ["A", "B", "C"] };
  }
  if (state.step === "ask_attr") {
    return { input_expected: "请输入五项先天属性，总和100", input_examples: ["根骨20 悟性20 神魂20 机缘20 心智20"] };
  }
  return { input_expected: "请输入行动", input_examples: ["闭关修炼", "炼制纳气丹", "服用纳气丹", "去坊市"] };
}

function inferActionTag(before: XianxiaState, after: XianxiaState, rawInput: string): string {
  if (before.step === "ask_name" && after.step === "ask_name") return "onboarding";
  if (before.step === "ask_name" && after.step === "ask_origin") return "name_setup";
  if (before.step === "ask_origin") return "origin_setup";
  if (before.step === "ask_attr") return "attribute_setup";
  if (rawInput.includes("选择男修") || rawInput.includes("选择女修") || rawInput.includes("自定义立绘")) return "avatar_setup";
  if (rawInput.includes("炼制") || rawInput.includes("服用")) return "alchemy";
  return detectActionTag(rawInput, false);
}

function finalizeReply(
  state: XianxiaState,
  replyText: string,
  nextSuggestions: string[],
  media: string[],
  violations: RuleViolation[] = [],
  meta?: { rawInput?: string; actionTag?: string; stateBefore?: XianxiaState },
): XianxiaResolveResult {
  const isDaozuPeak = state.realm.includes("道祖") && state.realm.includes("大圆满");
  const guarded = guardXianxiaReply(replyText, state.plane, isDaozuPeak);
  const before = meta?.stateBefore ?? cloneState(state);
  const structured: XianxiaStructuredTurn = {
    mode: "xianxia",
    raw_input: meta?.rawInput ?? "",
    action_tag: meta?.actionTag ?? inferActionTag(before, state, meta?.rawInput ?? ""),
    state_before: before,
    state_after: cloneState(state),
    effects: summarizeEffects(before, state),
    violations,
    world_changes: summarizeWorldChanges(before, state),
    suggestions: nextSuggestions,
    ui_hints: detectUiHints(state),
    media,
    fallback_text: guarded,
  };

  return { replyText: guarded, nextSuggestions, state, media, violations, structured };
}

function tryMajorBreakthrough(state: XianxiaState, input: string): { scene?: string; violations?: RuleViolation[]; media: string[] } {
  let media: string[] = [];

  if (input.includes("尝试筑基")) {
    if (state.realm !== "炼气期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("筑基失败：需先达到炼气后期圆满。") };
    }
    if (state.foundationPill < 1) {
      return { media, violations: blockedBreakthrough("筑基失败：缺少筑基丹。") };
    }
    state.foundationPill -= 1;
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "筑基期·前期"));
    return { media, scene: "丹田气海凝实成台，成功踏入筑基期·前期。" };
  }

  if (input.includes("尝试结丹")) {
    if (state.realm !== "筑基期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("结丹失败：需先达到筑基后期圆满。") };
    }
    if ((state.attributes?.willpower ?? 0) < 20) {
      return { media, violations: blockedBreakthrough("结丹失败：心智不足，难渡心魔。") };
    }
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "结丹期·前期"));
    media = appendMedia(media, MEDIA.JIEDAN);
    return { media, scene: "心魔劫散，金丹凝成，境界踏入结丹期·前期。" };
  }

  if (state.plane === "immortal" && input.includes("尝试凝印")) {
    if (state.lawPercent < 100) {
      return { media, violations: blockedBreakthrough("凝印失败：法则领悟需达到100%。") };
    }
    state.lawPercent = 0;
    state.daoSealCount += 1;
    media = appendMedia(media, MEDIA.JINXIAN);
    return { media, scene: `道火炼魂而不灭，成功凝聚第 ${state.daoSealCount} 枚道印。` };
  }

  return { media };
}

export function resolveXianxiaTurn(state: XianxiaState, text: string): XianxiaResolveResult {
  const rawInput = text.trim();
  const input = normalizeNaturalInput(rawInput);
  const turnStateBefore = cloneState(state);
  const finalize = (
    nextState: XianxiaState,
    replyText: string,
    nextSuggestions: string[],
    media: string[],
    violations: RuleViolation[] = [],
    actionTag?: string,
  ): XianxiaResolveResult =>
    finalizeReply(nextState, replyText, nextSuggestions, media, violations, {
      rawInput,
      actionTag,
      stateBefore: turnStateBefore,
    });

  const avatarSelection = parseAvatarSelection(input);
  if (avatarSelection) {
    state.avatar.preset = avatarSelection;
    const avatarLabel = avatarSelection === "male" ? "男修" : avatarSelection === "female" ? "女修" : "自定义";
    return finalize(state, [`立绘已切换为：${avatarLabel}。`, buildStatusIni(state)].join("\n\n"), ["报名号", "A", "B", "C"], [], [], "avatar_setup");
  }

  const wantsStartIdle =
    /(开始|先|我要|去)?\s*挂机/.test(input) &&
    !/(挂机状态|查看挂机|领取挂机|结算挂机|结束挂机|停止挂机|退出挂机)/.test(input);
  if (wantsStartIdle) {
    const m = input.match(/(\d+)\s*小时/);
    const hours = Math.max(1, Math.min(24, Number(m?.[1] ?? 1)));
    const start = new Date();
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    state.idle.active = true;
    state.idle.startedAt = start.toISOString();
    state.idle.endsAt = end.toISOString();
    state.idle.reminderSentAt = null;
    state.idle.scene = "洞府闭关";
    return finalize(
      state,
      [`已进入挂机历练：${hours}小时。挂机期间开启状态锁，仅可【挂机状态/领取挂机/结束挂机】。`, buildStatusIni(state)].join("\n\n"),
      ["挂机状态", "领取挂机", "结束挂机"],
      [],
      [],
      "idle_start",
    );
  }

  if (input.includes("挂机状态") || input.includes("查看挂机")) {
    const now = Date.now();
    const ends = state.idle.endsAt ? new Date(state.idle.endsAt).getTime() : null;
    const remain = state.idle.active && ends ? formatIdleRemainMs(ends - now) : "未挂机";
    return finalize(
      state,
      [`挂机状态：${state.idle.active ? "进行中" : "未开启"}。剩余：${remain}。`, buildStatusIni(state)].join("\n\n"),
      state.idle.active ? ["领取挂机", "结束挂机"] : ["开始挂机1小时", "闭关修炼"],
      [],
      [],
      "idle_status",
    );
  }

  if (input.includes("领取挂机") || input.includes("结算挂机")) {
    if (!state.idle.active || !state.idle.endsAt) {
      return finalize(state, "当前没有可领取的挂机收益。", ["开始挂机1小时", "闭关修炼"], [], [], "idle_claim");
    }
    const now = Date.now();
    const startTs = state.idle.startedAt ? new Date(state.idle.startedAt).getTime() : now;
    const endTs = new Date(state.idle.endsAt).getTime();
    if (now < endTs) {
      return finalize(
        state,
        `挂机尚未结束，仍需等待 ${formatIdleRemainMs(endTs - now)}。`,
        ["挂机状态", "结束挂机"],
        [],
        [],
        "idle_claim",
      );
    }
    const hours = Math.max(1, Math.floor((endTs - startTs) / (60 * 60 * 1000)));
    const stoneGain = 10 * hours + Math.floor((state.attributes?.fortune ?? 20) / 10) * hours;
    const cvGain = 12 * hours + Math.floor((state.attributes?.comprehension ?? 20) / 10) * hours;
    state.spiritStone += stoneGain;
    state.cultivationCurrent += cvGain;
    state.pillToxicity = Math.max(0, state.pillToxicity - hours);
    const logs = advanceSmallStages(state);
    state.idle.active = false;
    state.idle.startedAt = null;
    state.idle.endsAt = null;
    state.idle.scene = null;
    state.idle.reminderSentAt = null;
    return finalize(
      state,
      [`挂机结算完成：灵石 +${stoneGain}，真元 +${cvGain}。${logs.join(" ")}`.trim(), buildStatusIni(state)].join("\n\n"),
      ["闭关修炼", "去坊市", "外出探索"],
      [],
      [],
      "idle_claim",
    );
  }

  if (input.includes("结束挂机") || input.includes("停止挂机") || input.includes("退出挂机")) {
    if (!state.idle.active) {
      return finalize(state, "当前未处于挂机状态。", ["开始挂机1小时"], [], [], "idle_end");
    }
    state.idle.active = false;
    state.idle.startedAt = null;
    state.idle.endsAt = null;
    state.idle.scene = null;
    state.idle.reminderSentAt = null;
    return finalize(state, "已手动结束挂机，状态锁解除。", ["闭关修炼", "去坊市", "外出探索"], [], [], "idle_end");
  }

  if (state.idle.active) {
    return finalize(
      state,
      ["当前处于挂机状态锁。请先【领取挂机】或【结束挂机】后再进行剧情交互。", buildStatusIni(state)].join("\n\n"),
      ["挂机状态", "领取挂机", "结束挂机"],
      [],
      [],
      "idle_locked",
    );
  }

  const preViolations = validatePlayerInput(state, input);
  if (preViolations.length > 0) {
    return finalize(
      state,
      ["天道示警：当前行为不合此界法则。", ...preViolations.map((v) => `- ${v.code}: ${v.message}`), buildStatusIni(state)].join("\n\n"),
      ["闭关修炼", "去坊市", "外出探索"],
      [],
      preViolations,
      "rule_violation",
    );
  }

  if (state.step === "ask_name") {
    if (!input || input === "开始" || input === "开始修仙") {
      return finalize(
        state,
        ["天地初开，玄黄分野。", "修行之路先立真名，今请报上名号（可先选择男修/女修）。"].join("\n\n"),
        ["选择男修", "选择女修", "报上姓名"],
        [],
        [],
        "onboarding",
      );
    }
    state.name = input.slice(0, 16);
    state.step = "ask_origin";
    return finalize(state, [`真灵已定，其名为**${state.name}**。`, "请选择出身：A/B/C"].join("\n\n"), ["A", "B", "C"], [], [], "name_setup");
  }

  if (state.step === "ask_origin") {
    const origin = parseOrigin(input);
    if (!origin) return finalize(state, "命格未定，请在 A/B/C 中择其一。", ["A", "B", "C"], [], [], "origin_setup");

    state.origin = origin;
    if (origin === "B") state.bodyRealm = "后天锻体";
    if (origin === "C") state.soulRealm = "灵境雏形";
    state.step = "ask_attr";
    return finalize(
      state,
      "出身已定。请分配 100 点先天道蕴（根骨、悟性、神魂、机缘、心智）。",
      ["根骨20 悟性20 神魂20 机缘20 心智20"],
      [],
      [],
      "origin_setup",
    );
  }

  if (state.step === "ask_attr") {
    const attrs = parseAttributes(input);
    if (!attrs) {
      return finalize(state, "先天分配无效，请确保五项齐全且总和为100。", ["根骨20 悟性20 神魂20 机缘20 心智20"], [], [], "attribute_setup");
    }
    state.attributes = attrs;
    state.step = "in_world";
    state.goal = "[自由探索] 先稳固炼气修为，再寻筑基线索";
    return finalize(
      state,
      ["命数成形，修行正式开始。", "> A. 闭关修炼", "> B. 去坊市", "> C. 外出探索", "> D. 炼制纳气丹/回春丹/凝神丹", buildStatusIni(state)].join("\n\n"),
      ["闭关修炼", "去坊市", "外出探索", "炼制纳气丹", "服用纳气丹"],
      [],
      [],
      "attribute_setup",
    );
  }

  let media: string[] = [];
  let scene = "";
  let usedMajorBreakthrough = false;

  const major = tryMajorBreakthrough(state, input);
  media = appendMedia(media, ...major.media);
  if (major.violations) {
    return finalize(state, ["天道压下劫门，突破条件尚未齐备。", ...major.violations.map((v) => `- ${v.code}: ${v.message}`), buildStatusIni(state)].join("\n\n"), ["闭关修炼", "去坊市", "外出探索"], media, major.violations, "breakthrough");
  }
  if (major.scene) {
    scene = major.scene;
    usedMajorBreakthrough = true;
  }

  if (!scene) {
    const potionScene = applyPotionCommand(state, input);
    if (potionScene) {
      scene = potionScene;
      state.goal = "[丹药调理] 以丹药稳固修为与状态";
    }
  }

  if (!scene && (input.includes("闭关") || input.includes("修炼"))) {
    const baseGain = 8 + Math.floor((state.attributes?.comprehension ?? 20) / 10);
    const buffGain = state.focusBuffTurns > 0 ? 10 : 0;
    const gain = baseGain + buffGain;
    state.cultivationCurrent += gain;
    state.mp = Math.max(40, state.mp - 8);
    if (state.focusBuffTurns > 0) state.focusBuffTurns -= 1;
    state.goal = "[闭关清修] 累积真元，冲击下一小境界";
    const logs = advanceSmallStages(state);
    scene = `静室之中，灵息绵长，修为增长 ${gain}。${logs.join(" ")}`;
    state.pillToxicity = Math.max(0, state.pillToxicity - 2);
  }

  if (!scene && (input.includes("坊市") || input.includes("交易") || input.includes("买"))) {
    state.spiritStone = Math.max(0, state.spiritStone - 12);
    state.mp = Math.min(100, state.mp + 5);
    state.goal = "[坊市周旋] 收集丹药与突破材料线索";
    scene = "坊市人潮拥挤，几番试探后换得一份可疑线图，灵石消耗 12。";
  }

  if (!scene) {
    const gainStone = 10 + Math.floor((state.attributes?.fortune ?? 20) / 10);
    state.spiritStone += gainStone;
    state.hp = Math.max(65, state.hp - 6);
    state.goal = "[外出历练] 扩展地图并寻找遗府传闻";
    scene = `山道多雾，沿途斩除低阶妖兽，收得灵石 ${gainStone}。`;
  }

  if (state.pillToxicity >= 100) {
    state.hp = Math.max(1, state.hp - 20);
    state.mp = Math.max(1, state.mp - 20);
    state.focusBuffTurns = 0;
    state.pillToxicity = 60;
    scene += " 丹毒反噬骤起，气血与法力受损。";
  }

  const worldLogs = evolveWorld(state, detectActionTag(input, usedMajorBreakthrough));
  if (state.worldEvent.stage === "终末期" && !state.worldEvent.finaleMediaEmitted) {
    media = appendMedia(media, MEDIA.SECT_WAR_FINAL);
    state.worldEvent.finaleMediaEmitted = true;
    worldLogs.push("宗门战争已至终末，胜负将于此役分晓。");
  }

  const reply = [
    ...media,
    scene,
    worldLogs.join(" "),
    "> A. 继续闭关",
    "> B. 回坊市补给",
    "> C. 深入野外历练",
    "> D. 炼制纳气丹 / 回春丹 / 凝神丹",
    "> E. 服用纳气丹 / 回春丹 / 凝神丹",
    buildStatusIni(state),
  ].join("\n\n");

  return finalize(
    state,
    reply,
    ["继续闭关", "回坊市", "深入历练", "炼制纳气丹", "服用纳气丹", "服用回春丹", "服用凝神丹", "尝试筑基", "尝试结丹"],
    media,
    [],
    usedMajorBreakthrough ? "breakthrough" : undefined,
  );
}
