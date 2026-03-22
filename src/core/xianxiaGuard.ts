import type { XianxiaPlane } from "./types.js";

const endLikeTerms = ["全文完", "故事结束", "传奇将继续", "完美的蜕变", "感谢你陪伴"];

const forbiddenByPlane: Record<XianxiaPlane, string[]> = {
  human: ["北寒仙域", "中天仙域", "轮回仙域", "天庭", "大罗金仙", "道祖", "仙元石"],
  spirit: ["北寒仙域", "中天仙域", "轮回仙域", "天庭", "道祖"],
  immortal: [],
};

function removeForbiddenTerms(text: string, plane: XianxiaPlane): string {
  let result = text;
  for (const term of forbiddenByPlane[plane]) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), "上界传闻");
  }
  return result;
}

function stripEndingTerms(text: string): string {
  let result = text;
  for (const term of endLikeTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), "仙途未止");
  }
  return result;
}

function ensureSingleIniBlock(text: string): string {
  const matches = text.match(/```ini/g) ?? [];
  if (matches.length <= 1) return text;

  const first = text.indexOf("```ini");
  if (first < 0) return text;

  const end = text.indexOf("```", first + 6);
  if (end < 0) return text;

  const keep = text.slice(0, end + 3);
  const rest = text.slice(end + 3).replace(/```ini[\s\S]*?```/g, "");
  return `${keep}\n\n${rest}`.trim();
}

export function guardXianxiaReply(text: string, plane: XianxiaPlane, isDaozuPeak: boolean): string {
  let guarded = text;

  if (!isDaozuPeak) {
    guarded = stripEndingTerms(guarded);
  }

  guarded = removeForbiddenTerms(guarded, plane);
  guarded = ensureSingleIniBlock(guarded);

  return guarded;
}
