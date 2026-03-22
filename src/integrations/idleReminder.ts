import type { GameRepo } from "../repo/gameRepo.js";
import { pushOpenClawMessage } from "./openclawPush.js";

let started = false;

export function startIdleReminderLoop(repo: GameRepo, log: { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void }): void {
  if (started) return;
  started = true;

  const enabled = process.env.OPENCLAW_IDLE_REMINDER_ENABLED?.trim() !== "0";
  if (!enabled) {
    log.info("idle reminder loop disabled");
    return;
  }

  const intervalMs = Number(process.env.OPENCLAW_IDLE_REMINDER_INTERVAL_MS ?? 60000);

  setInterval(async () => {
    try {
      const nowIso = new Date().toISOString();
      const due = await repo.listDueIdleXianxiaStates(nowIso);
      for (const state of due) {
        const identities = await repo.getUserIdentities(state.userId);
        if (!identities.length) continue;

        const text = "你在【挂机历练】中的历练已完成，可发送“领取挂机”结算收益。";
        let pushed = false;
        for (const identity of identities) {
          const ok = await pushOpenClawMessage(identity, text);
          pushed = pushed || ok;
        }

        if (pushed) {
          state.idle.reminderSentAt = nowIso;
          await repo.saveXianxiaState(state);
        }
      }
    } catch (err) {
      log.error({ err }, "idle reminder loop tick failed");
    }
  }, intervalMs);

  log.info(`idle reminder loop started (${intervalMs}ms)`);
}
