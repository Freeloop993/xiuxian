import type { FastifyInstance } from "fastify";
import { resolveTurn } from "../core/engine.js";
import { resolveXianxiaTurn } from "../core/xianxiaEngine.js";
import type { GameMode, OpenClawInbound } from "../core/types.js";
import { createRepo } from "../repo/repoFactory.js";

const repo = createRepo();

function toIdempotentKey(body: OpenClawInbound): string {
  return `${body.channel}:${body.channel_user_id}:${body.timestamp}`;
}

function detectModeSwitch(text: string): GameMode | null {
  const t = text.trim();
  if (!t) return null;

  if (t.includes("切换修仙") || t === "/mode xianxia" || t === "xianxia") {
    return "xianxia";
  }

  if (t.includes("切换龙虾") || t === "/mode lobster" || t === "lobster") {
    return "lobster";
  }

  return null;
}

export async function registerOpenClawRoutes(app: FastifyInstance): Promise<void> {
  await repo.init();

  app.post<{ Body: OpenClawInbound }>("/webhooks/openclaw", async (request, reply) => {
    const body = request.body;
    if (!body || !body.channel || !body.channel_user_id || !body.timestamp) {
      return reply.code(400).send({ error: "E_BAD_REQUEST", message: "missing required fields" });
    }

    const userId = await repo.getOrCreateUser({
      channel: body.channel,
      channelUserId: body.channel_user_id,
    });

    const switchTo = detectModeSwitch(body.text ?? "");
    if (switchTo) {
      await repo.setMode(userId, switchTo);
      return reply.code(200).send({
        reply_text:
          switchTo === "xianxia"
            ? "已切换到修仙模式。先回复你的名号，开始开局流程。"
            : "已切换到龙虾日常模式。你可以直接安排下一个时段行动。",
        game_state: {
          mode: switchTo,
        },
        next_suggestions:
          switchTo === "xianxia" ? ["开始修仙", "报上名号"] : ["去工坊打工", "去酒馆社交", "回家休息"],
      });
    }

    const idempotentKey = toIdempotentKey(body);
    if (await repo.isDuplicate(idempotentKey)) {
      return reply.code(200).send({
        reply_text: "这条消息已经处理过了，我们继续下一步吧。",
        game_state: null,
        next_suggestions: ["继续当前计划", "换个地点试试"],
      });
    }

    const mode = await repo.getMode(userId);

    try {
      if (mode === "xianxia") {
        const state = (await repo.getXianxiaState(userId)) ?? (await repo.createDefaultXianxiaState(userId));
        const resolved = resolveXianxiaTurn(state, body.text ?? "");
        await repo.saveXianxiaState(resolved.state);
        await repo.rememberRequest(idempotentKey);

        return reply.code(200).send({
          reply_text: resolved.replyText,
          game_state: {
            mode,
            step: resolved.state.step,
            plane: resolved.state.plane,
            name: resolved.state.name,
            realm: resolved.state.realm,
            cultivation: {
              current: resolved.state.cultivationCurrent,
              max: resolved.state.cultivationMax,
            },
            law_percent: resolved.state.lawPercent,
            dao_seal_count: resolved.state.daoSealCount,
            world_event: resolved.state.worldEvent,
            faction_reputation: resolved.state.factionReputation,
            npc_relations: resolved.state.npcRelations,
          },
          media: resolved.media,
          rule_violations: resolved.violations,
          next_suggestions: resolved.nextSuggestions,
        });
      }

      const currentState = (await repo.getState(userId)) ?? (await repo.createDefaultState(userId));
      const resolved = resolveTurn(currentState, body.text ?? "");
      await repo.saveState(resolved.state);
      await repo.rememberRequest(idempotentKey);

      return reply.code(200).send({
        reply_text: resolved.replyText,
        game_state: {
          mode,
          day: resolved.state.day,
          timeslot: resolved.state.timeslot,
          location: resolved.state.location,
          persona: resolved.state.persona,
          stats: resolved.state.stats,
        },
        next_suggestions: resolved.nextSuggestions,
      });
    } catch (error) {
      request.log.error({ err: error }, "openclaw webhook failed");
      return reply.code(500).send({
        error: "E_INTERNAL",
        reply_text: "海底信号有点不稳，这一回合先记在账上，稍后再试。",
      });
    }
  });

  app.get("/state/:channel/:channelUserId", async (request, reply) => {
    const params = request.params as { channel: string; channelUserId: string };
    const userId = await repo.getOrCreateUser({
      channel: (params.channel as OpenClawInbound["channel"]) ?? "other",
      channelUserId: params.channelUserId,
    });

    const mode = await repo.getMode(userId);
    const lobster = (await repo.getState(userId)) ?? (await repo.createDefaultState(userId));
    const xianxia = (await repo.getXianxiaState(userId)) ?? (await repo.createDefaultXianxiaState(userId));

    return reply.send({
      user_id: userId,
      mode,
      lobster,
      xianxia,
    });
  });
}
