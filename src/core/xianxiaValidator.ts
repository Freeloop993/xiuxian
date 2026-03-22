import type { RuleViolation, XianxiaState } from "./types.js";

const highPlaneTerms = ["北寒仙域", "中天仙域", "轮回仙域", "天庭", "大罗", "道祖", "仙元石", "飞升仙界"];
const cheatTerms = ["我已突破", "我已经突破", "我直接飞升", "我获得了神器", "我现在是道祖", "我凝聚了道印"];

export function validatePlayerInput(state: XianxiaState, input: string): RuleViolation[] {
  const text = input.trim();
  if (!text) return [];

  const violations: RuleViolation[] = [];

  if (cheatTerms.some((t) => text.includes(t))) {
    violations.push({
      code: "E_RULE_REALM_CHEAT",
      message: "成长必须通过世界内行动与规则推进，不能直接宣告突破或获得神器。",
    });
  }

  if (state.plane === "human" && highPlaneTerms.some((t) => text.includes(t))) {
    violations.push({
      code: "E_RULE_PLANE_LEAK",
      message: "当前位于人界，相关高位面知识不可直接接触。",
    });
  }

  return violations;
}

export function blockedBreakthrough(reason: string): RuleViolation[] {
  return [
    {
      code: "E_RULE_BREAKTHROUGH_BLOCKED",
      message: reason,
    },
  ];
}
