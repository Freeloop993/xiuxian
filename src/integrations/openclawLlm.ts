import type { RuleViolation, XianxiaState } from "../core/types.js";

interface EnhanceInput {
  state: XianxiaState;
  userText: string;
  engineReply: string;
  nextSuggestions: string[];
  violations: RuleViolation[];
}

interface OpenAIStyleResponse {
  choices?: Array<{ message?: { content?: string } }>;
  output_text?: string;
  content?: string;
}

function extractText(payload: OpenAIStyleResponse): string | null {
  if (payload.output_text && payload.output_text.trim()) return payload.output_text.trim();
  if (payload.content && payload.content.trim()) return payload.content.trim();
  const choice = payload.choices?.[0]?.message?.content;
  if (choice && choice.trim()) return choice.trim();
  return null;
}

function buildSystemPrompt(): string {
  return [
    "你是玄黄修仙世界叙事器。",
    "目标：基于给定状态与规则结果，输出更具沉浸感、戏剧张力的中文叙事。",
    "必须遵守：",
    "1) 不可篡改状态数值与规则结果。",
    "2) 不可越过位面/境界限制。",
    "3) 输出为简体中文。",
    "4) 保留并原样输出输入中的 ini 状态块。",
    "5) 末尾给出 3-5 个行动选项（A/B/C...）。",
  ].join("\n");
}

function buildUserPrompt(input: EnhanceInput): string {
  const violationText = input.violations.length
    ? input.violations.map((v) => `- ${v.code}: ${v.message}`).join("\n")
    : "- 无";

  return [
    `用户输入：${input.userText || "(空)"}`,
    `当前位面：${input.state.plane}`,
    `当前境界：${input.state.realm}`,
    `当前目标：${input.state.goal}`,
    `建议动作：${input.nextSuggestions.join(" / ")}`,
    "规则违规：",
    violationText,
    "",
    "下面是规则引擎生成的基础文本，请保留其事实结果并提升叙事质量：",
    input.engineReply,
  ].join("\n");
}

export async function enhanceXianxiaReplyWithOpenClaw(input: EnhanceInput): Promise<string> {
  const url = process.env.OPENCLAW_LLM_URL?.trim();
  if (!url) {
    return input.engineReply;
  }

  const model = process.env.OPENCLAW_MODEL?.trim() || "openclaw-default";
  const token = process.env.OPENCLAW_API_KEY?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = {
    model,
    temperature: 0.85,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return input.engineReply;
    }

    const data = (await res.json()) as OpenAIStyleResponse;
    const text = extractText(data);
    return text || input.engineReply;
  } catch {
    return input.engineReply;
  }
}
