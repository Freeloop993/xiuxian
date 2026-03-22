import rules from "../../data/xianxia.rules.json" with { type: "json" };

export interface XianxiaRules {
  hard_rules: {
    output_language: string;
    ending_gate: string;
    plane_restriction: string;
    realm_consistency: string;
    content_style: string;
  };
}

export const xianxiaRules = rules as XianxiaRules;
