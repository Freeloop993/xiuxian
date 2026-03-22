import type { RuleViolation, XianxiaResolveResult, XianxiaAttributes, XianxiaPlane, XianxiaState } from "./types.js";
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

function parseAttributes(text: string): XianxiaAttributes | null {
  const normalized = text.replace(/：/g, ":").replace(/，/g, ",").replace(/\s+/g, "");
  const keys = ["根骨", "悟性", "神魂", "机缘", "心智"];
  const values: number[] = [];

  for (const key of keys) {
    const match = normalized.match(new RegExp(`${key}:(\\d{1,3})`));
    if (!match) return null;
    values.push(Number(match[1]));
  }

  const total = values.reduce((sum, n) => sum + n, 0);
  if (total !== 100) return null;

  return {
    physique: values[0],
    comprehension: values[1],
    soul: values[2],
    fortune: values[3],
    willpower: values[4],
  };
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

function itemLine(state: XianxiaState): string {
  const parts = ["低阶纳气丹 x2", "粗制匕首 x1"];
  if (state.foundationPill > 0) parts.push(`筑基丹 x${state.foundationPill}`);
  if (state.insightRelic > 0) parts.push(`悟道之物 x${state.insightRelic}`);
  if (state.spiritEyeAccess) parts.push("通天灵眼令牌 x1");
  return parts.join(", ");
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

  return [
    "```ini",
    "[修行者状态]",
    `📜 名  号 : ${state.name}`,
    `⛰️ 境  界 : ${state.realm}`,
    `💪 肉  身 : ${state.bodyRealm}`,
    `🧠 神  识 : ${state.soulRealm} (无)`,
    `✨ 修  为 : ${cultivationLine(state)}`,
    `💎 道  印 : ${state.daoSealCount > 0 ? `${state.daoSealCount} 枚` : "暂无"}`,
    "📖 功  法 : 青元纳气诀, 无",
    `🏺 物  品 : ${itemLine(state)}`,
    `💰 资  产 : 灵石 ${state.spiritStone} / 仙元石 ${state.immortalStone}`,
    `❤️ 状  态 : HP ${state.hp}/100, MP ${state.mp}/100, 健康`,
    `💀 煞  气 : ${state.shaQi} (轻微)`,
    `🎯 目  标 : ${state.goal}`,
    `🐾 灵  兽 : ${state.beastName} ([状态: ${state.beastStage}], [等级: ${state.beastLevel}])`,
    `🔗 关  系 : ${state.relationSummary}`,
    `🧬 先天 : ${attrLine}`,
    "```",
  ].join("\n");
}

function finalizeReply(
  state: XianxiaState,
  replyText: string,
  nextSuggestions: string[],
  media: string[],
  violations: RuleViolation[] = [],
): XianxiaResolveResult {
  const isDaozuPeak = state.realm.includes("道祖") && state.realm.includes("大圆满");
  const guarded = guardXianxiaReply(replyText, state.plane, isDaozuPeak);
  return {
    replyText: guarded,
    nextSuggestions,
    state,
    media,
    violations,
  };
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
    return { media, scene: "丹田气海凝实成台，灵液初成，成功踏入**筑基期·前期**。" };
  }

  if (input.includes("尝试结丹")) {
    const willpower = state.attributes?.willpower ?? 0;
    if (state.realm !== "筑基期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("结丹失败：需先达到筑基后期圆满。") };
    }
    if (willpower < 20) {
      return { media, violations: blockedBreakthrough("结丹失败：心智不足，难渡心魔。") };
    }
    if (state.spiritStone < 3000) {
      return { media, violations: blockedBreakthrough("结丹失败：灵石不足，至少需要 3000。") };
    }

    state.spiritStone -= 3000;
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "结丹期·前期"));
    media = appendMedia(media, MEDIA.JIEDAN);
    return { media, scene: "心魔劫散，金丹凝成，灵压骤升，境界踏入**结丹期·前期**。" };
  }

  if (input.includes("尝试元婴")) {
    if (state.realm !== "结丹期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("元婴失败：需先达到结丹后期圆满。") };
    }
    if (!state.spiritEyeAccess) {
      return { media, violations: blockedBreakthrough("元婴失败：未取得通天灵眼资格。") };
    }
    if (state.spiritStone < 5000) {
      return { media, violations: blockedBreakthrough("元婴失败：灵石不足，至少需要 5000。") };
    }

    state.spiritStone -= 5000;
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "元婴期·前期"));
    return { media, scene: "金丹碎而不散，元婴初啼，神识暴涨，成功晋入**元婴期·前期**。" };
  }

  if (input.includes("尝试化神")) {
    if (state.realm !== "元婴期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("化神失败：需先达到元婴后期圆满。") };
    }
    if (state.insightRelic < 1) {
      return { media, violations: blockedBreakthrough("化神失败：缺少悟道之物。") };
    }
    if (state.spiritStone < 8000) {
      return { media, violations: blockedBreakthrough("化神失败：灵石不足，至少需要 8000。") };
    }

    state.insightRelic -= 1;
    state.spiritStone -= 8000;
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "化神期·前期"));
    return { media, scene: "元神蜕变，神念通明，终于触及法则边缘，踏入**化神期·前期**。" };
  }

  if (input.includes("尝试合体") && state.plane === "spirit") {
    if (state.realm !== "炼虚期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("合体失败：需先达到炼虚后期圆满。") };
    }
    if (state.insightRelic < 1 || state.spiritStone < 12000) {
      return { media, violations: blockedBreakthrough("合体失败：需要悟道之物 x1 与灵石 12000。") };
    }

    state.insightRelic -= 1;
    state.spiritStone -= 12000;
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "合体期·前期"));
    return { media, scene: "法身初成，元神与肉身同频共振，晋入**合体期·前期**。" };
  }

  if (input.includes("尝试大乘") && state.plane === "spirit") {
    const willpower = state.attributes?.willpower ?? 0;
    if (state.realm !== "合体期·后期" || state.cultivationCurrent < state.cultivationMax) {
      return { media, violations: blockedBreakthrough("大乘失败：需先达到合体后期圆满。") };
    }
    if (willpower < 30 || state.spiritStone < 20000) {
      return { media, violations: blockedBreakthrough("大乘失败：心智需达到30且灵石需达到20000。") };
    }

    state.spiritStone -= 20000;
    state.cultivationCurrent = 0;
    applyStage(state, getStages(state).findIndex((s) => s.realm === "大乘期·前期"));
    media = appendMedia(media, MEDIA.DACHENG);
    return { media, scene: "天地三劫尽散，领域初张，修为跨入**大乘期·前期**。" };
  }

  if (input.includes("尝试飞升")) {
    if (state.plane === "human") {
      if (state.realm !== "化神期·后期" || state.cultivationCurrent < state.cultivationMax) {
        return { media, violations: blockedBreakthrough("飞升失败：需先达到化神后期圆满。") };
      }
      state.plane = "spirit";
      state.realm = "炼虚期·前期";
      state.cultivationCurrent = 0;
      state.cultivationMax = 10000;
      state.goal = "[飞升灵界] 立足风元大陆，补齐炼虚资源";
      media = appendMedia(media, MEDIA.ASCEND_SPIRIT);
      return { media, scene: "通道撕裂，天劫轰鸣，身形穿过界壁，已飞升至**灵界**。" };
    }

    if (state.plane === "spirit") {
      if (state.realm !== "大乘期·后期" || state.cultivationCurrent < state.cultivationMax) {
        return { media, violations: blockedBreakthrough("飞升失败：需先达到大乘后期圆满。") };
      }
      state.plane = "immortal";
      state.realm = "真仙·初期";
      state.cultivationCurrent = 0;
      state.cultivationMax = 0;
      state.lawPercent = 0;
      state.immortalStone += 120;
      state.goal = "[飞升仙界] 参悟法则并尝试凝聚道印";
      media = appendMedia(media, MEDIA.ASCEND_IMMORTAL);
      return { media, scene: "大道震荡，仙门洞开，历经劫火后踏入**仙界真仙境**。" };
    }

    return { media, violations: blockedBreakthrough("当前已在仙界，无需再次飞升。") };
  }

  if (state.plane === "immortal" && input.includes("尝试凝印")) {
    if (state.lawPercent < 100) {
      return { media, violations: blockedBreakthrough("凝印失败：法则领悟需达到100%。") };
    }
    state.lawPercent = 0;
    state.daoSealCount += 1;
    media = appendMedia(media, MEDIA.JINXIAN);
    return { media, scene: `道火炼魂而不灭，成功凝聚第 ${state.daoSealCount} 枚**道印**。` };
  }

  return { media };
}

export function resolveXianxiaTurn(state: XianxiaState, text: string): XianxiaResolveResult {
  const input = text.trim();
  const preViolations = validatePlayerInput(state, input);
  if (preViolations.length > 0) {
    const replyText = [
      "天道示警：当前行为不合此界法则。",
      ...preViolations.map((v) => `- ${v.code}: ${v.message}`),
      buildStatusIni(state),
    ].join("\n\n");

    return finalizeReply(state, replyText, ["闭关修炼", "去坊市", "外出探索"], [], preViolations);
  }

  if (state.step === "ask_name") {
    if (!input || input === "开始" || input === "开始修仙") {
      return finalizeReply(
        state,
        ["天地初开，玄黄分野，命数在长夜中缓缓转动。", "修行之路先立真名，今请报上名号。"].join("\n\n"),
        ["报上姓名"],
        [],
      );
    }

    state.name = input.slice(0, 16);
    state.step = "ask_origin";
    return finalizeReply(
      state,
      [
        `真灵已定，其名为**${state.name}**。`,
        "请择一处出身之地：",
        "> A. 天南之地 · 越国山村",
        "> B. 乱星之海 · 海岛渔村",
        "> C. 大晋王朝 · 没落世家",
      ].join("\n\n"),
      ["A", "B", "C"],
      [],
    );
  }

  if (state.step === "ask_origin") {
    const origin = parseOrigin(input);
    if (!origin) return finalizeReply(state, "命格未定，请在 A/B/C 中择其一。", ["A", "B", "C"], []);

    state.origin = origin;
    if (origin === "A") {
      state.goal = "[先天分配] 山村出身，道心更稳";
    } else if (origin === "B") {
      state.bodyRealm = "后天锻体";
      state.goal = "[先天分配] 渔村出身，体魄占优";
    } else {
      state.soulRealm = "灵境雏形";
      state.goal = "[先天分配] 世家出身，神识占优";
    }

    state.step = "ask_attr";
    return finalizeReply(
      state,
      [
        "出身已定，天道赐下 100 点先天道蕴。",
        "请按格式分配：`根骨:20,悟性:20,神魂:20,机缘:20,心智:20`（总和必须为100）。",
      ].join("\n\n"),
      ["根骨:20,悟性:20,神魂:20,机缘:20,心智:20"],
      [],
    );
  }

  if (state.step === "ask_attr") {
    const attrs = parseAttributes(input);
    if (!attrs) {
      return finalizeReply(
        state,
        "先天分配无效。请严格使用格式并确保总和为100。",
        ["根骨:20,悟性:20,神魂:20,机缘:20,心智:20"],
        [],
      );
    }

    state.attributes = attrs;
    state.step = "in_world";
    state.goal = "[自由探索] 先稳固炼气修为，再寻筑基线索";

    return finalizeReply(
      state,
      [
        "命数成形，修行正式开始。晨雾沿着屋檐滑落，灵气稀薄却并未断绝。",
        "> A. 就地闭关一月，稳固纳气",
        "> B. 前往坊市，打探功法与丹药价格",
        "> C. 出村探路，寻找机缘",
        buildStatusIni(state),
      ].join("\n\n"),
      ["闭关修炼", "去坊市", "外出探索", "购买筑基丹"],
      [],
    );
  }

  const beforeRealm = state.realm;
  let media: string[] = [];
  let scene = "";
  let usedMajorBreakthrough = false;

  const major = tryMajorBreakthrough(state, input);
  media = appendMedia(media, ...major.media);

  if (major.violations) {
    return finalizeReply(
      state,
      [
        "天道压下劫门，突破条件尚未齐备。",
        ...major.violations.map((v) => `- ${v.code}: ${v.message}`),
        buildStatusIni(state),
      ].join("\n\n"),
      ["闭关修炼", "去坊市", "外出探索"],
      media,
      major.violations,
    );
  }

  if (major.scene) {
    scene = major.scene;
    usedMajorBreakthrough = true;
  } else if (state.plane === "immortal" && (input.includes("闭关") || input.includes("参悟"))) {
    const gain = 2 + Math.floor((state.attributes?.comprehension ?? 20) / 20);
    state.lawPercent = Math.min(100, state.lawPercent + gain);
    state.goal = "[仙界参悟] 提升法则领悟并尝试凝印";
    scene = `你在仙域边界盘坐三日，法则纹理渐明，法则领悟 +${gain}%。`;
  } else if (input.includes("购买筑基丹")) {
    if (state.spiritStone < 500) {
      scene = "坊市摊主只看了一眼储物袋，摇头不语：灵石不足，暂不可得筑基丹。";
    } else {
      state.spiritStone -= 500;
      state.foundationPill += 1;
      scene = "你在暗铺中购得一枚筑基丹，丹纹尚稳，先收于玉匣。";
    }
  } else if (input.includes("购买悟道") || input.includes("购买悟道之物")) {
    if (state.spiritStone < 1200) {
      scene = "悟道之物有价无市，灵石不足，线索被他人先一步拿走。";
    } else {
      state.spiritStone -= 1200;
      state.insightRelic += 1;
      scene = "你以高价换得一块残缺悟道碑，神识触及其上时隐有共鸣。";
    }
  } else if (input.includes("闭关") || input.includes("修炼")) {
    const gain = 8 + Math.floor((state.attributes?.comprehension ?? 20) / 10);
    state.cultivationCurrent += gain;
    state.mp = Math.max(40, state.mp - 8);
    state.goal = "[闭关清修] 累积真元，冲击下一小境界";
    const logs = advanceSmallStages(state);
    scene = `静室之中，灵息绵长，修为增长 ${gain}。${logs.join(" ")}`;
  } else if (input.includes("坊市") || input.includes("交易") || input.includes("买")) {
    state.spiritStone = Math.max(0, state.spiritStone - 12);
    state.mp = Math.min(100, state.mp + 5);
    state.goal = "[坊市周旋] 收集丹药与突破材料线索";
    scene = "坊市人潮拥挤，几番试探后换得一份可疑线图，灵石消耗 12。";
  } else {
    const gainStone = 10 + Math.floor((state.attributes?.fortune ?? 20) / 10);
    state.spiritStone += gainStone;
    state.hp = Math.max(65, state.hp - 6);
    state.goal = "[外出历练] 扩展地图并寻找遗府传闻";

    if (state.plane === "human" && !state.spiritEyeAccess && state.realm.startsWith("结丹") && (state.attributes?.fortune ?? 0) >= 20) {
      state.spiritEyeAccess = true;
      scene = `山道多雾，沿途斩除低阶妖兽，收得灵石 ${gainStone}，并在古碑后获得通天灵眼令牌。`;
    } else {
      scene = `山道多雾，沿途斩除低阶妖兽，收得灵石 ${gainStone}。`;
    }
  }

  const worldLogs = evolveWorld(state, detectActionTag(input, usedMajorBreakthrough));
  if (state.worldEvent.stage === "终末期" && !state.worldEvent.finaleMediaEmitted) {
    media = appendMedia(media, MEDIA.SECT_WAR_FINAL);
    state.worldEvent.finaleMediaEmitted = true;
    worldLogs.push("宗门战争已至终末，胜负将于此役分晓。");
  }
  const worldLine = worldLogs.join(" ");

  const reply = [
    ...media,
    scene,
    worldLine,
    "> A. 继续闭关",
    "> B. 回坊市补给",
    "> C. 深入野外历练",
    "> D. 尝试筑基 / 尝试结丹 / 尝试元婴 / 尝试化神 / 尝试飞升",
    "> E. 购买筑基丹 / 购买悟道之物 / 尝试凝印",
    buildStatusIni(state),
  ].join("\n\n");

  return finalizeReply(
    state,
    reply,
    ["继续闭关", "回坊市", "深入历练", "尝试筑基", "尝试结丹", "尝试元婴", "尝试化神", "尝试飞升"],
    media,
  );
}
