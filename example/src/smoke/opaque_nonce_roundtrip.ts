import { strict as assert } from "node:assert";
import type { PrismaClient } from "@prisma/client";

import { AuthCodeRepository } from "../repositories/auth_code_repository.js";
import { Client } from "../entities/client.js";

/**
 * Smoke fixture: proves the example's opaque authorization-code persistence
 * round-trips the OIDC `nonce`, `authTime`, and `maxAge` fields. Opaque-code
 * repositories MUST persist these or OIDC nonce binding is lost across the
 * authorize → token round trip (the library's fail-loud guard then rejects the
 * exchange with invalid_grant). Run with `pnpm smoke`.
 */

// In-memory stand-in for PrismaClient so the fixture needs no database.
function fakePrisma(clientRow: Record<string, unknown>) {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    oAuthAuthCode: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        rows.set(String(data.code), data);
        return data;
      },
      findUnique: async ({ where }: { where: { code: string } }) => {
        const row = rows.get(where.code);
        if (!row) throw new Error("auth code not found");
        return { ...row, client: clientRow };
      },
      update: async () => undefined,
    },
  } as unknown as PrismaClient;
}

async function main() {
  const clientRow = {
    id: "client-1",
    name: "smoke client",
    secret: null,
    redirectUris: ["https://rp.example/callback"],
    allowedGrants: ["authorization_code"],
    createdAt: new Date(),
  };
  const client = new Client(clientRow as never);

  const repository = new AuthCodeRepository(fakePrisma(clientRow));

  const authCode = repository.issueAuthCode(client, undefined, []);
  authCode.nonce = "nonce-roundtrip";
  authCode.authTime = 1_700_000_000;
  authCode.maxAge = 300;

  await repository.persist(authCode);

  const reloaded = await repository.getByIdentifier(authCode.code);

  assert.equal(reloaded.nonce, "nonce-roundtrip", "nonce must survive the opaque-code round trip");
  assert.equal(reloaded.authTime, 1_700_000_000, "authTime must survive the opaque-code round trip");
  assert.equal(reloaded.maxAge, 300, "maxAge must survive the opaque-code round trip");

  console.log("OK: opaque auth-code nonce/authTime/maxAge round-trip preserved");
}

main().catch(err => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
