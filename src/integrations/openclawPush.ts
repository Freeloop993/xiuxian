import type { SessionIdentity } from "../repo/gameRepo.js";

export async function pushOpenClawMessage(identity: SessionIdentity, text: string): Promise<boolean> {
  const url = process.env.OPENCLAW_PUSH_URL?.trim();
  if (!url) return false;

  const token = process.env.OPENCLAW_API_KEY?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const payload = {
    channel: identity.channel,
    channel_user_id: identity.channelUserId,
    text,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
