import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerOpenClawRoutes } from "./integrations/openclaw.js";

const app = Fastify({ logger: true });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

await app.register(fastifyStatic, {
  root: publicDir,
  prefix: "/",
});

app.get("/health", async () => ({ ok: true }));

await registerOpenClawRoutes(app);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`server running at http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
