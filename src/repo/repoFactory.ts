import type { GameRepo } from "./gameRepo.js";
import { InMemoryRepo } from "./inMemoryRepo.js";
import { PgRepo } from "./pgRepo.js";

export function createRepo(): GameRepo {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return new PgRepo(databaseUrl);
  }
  return new InMemoryRepo();
}
