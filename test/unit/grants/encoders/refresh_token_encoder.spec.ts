import { describe, it, expect, beforeEach } from "vitest";

import { OAuthClient } from "../../../../src/entities/client.entity.js";
import { OAuthScope } from "../../../../src/entities/scope.entity.js";
import { OAuthToken } from "../../../../src/entities/token.entity.js";
import { OAuthException } from "../../../../src/exceptions/oauth.exception.js";
import {
  JwtRefreshTokenEncoder,
  OpaqueRefreshTokenEncoder,
} from "../../../../src/grants/encoders/refresh_token_encoder.js";
import { JwtService } from "../../../../src/utils/jwt.js";
import { DateInterval } from "../../../../src/utils/date_interval.js";
import { inMemoryDatabase } from "../../../e2e/_helpers/in_memory/database.js";
import { inMemoryAccessTokenRepository } from "../../../e2e/_helpers/in_memory/repository.js";

const oneHourInFuture = new DateInterval("1h").getEndDate();

const buildClient = (): OAuthClient => ({
  id: "client-id",
  name: "test-client",
  secret: "secret",
  redirectUris: ["http://example.com/callback"],
  allowedGrants: ["refresh_token"],
  scopes: [],
});

const buildScopes = (): OAuthScope[] => [
  { name: "read" },
  { name: "write" },
];

const buildToken = (client: OAuthClient): OAuthToken => ({
  accessToken: "access-token-id",
  accessTokenExpiresAt: oneHourInFuture,
  refreshToken: "refresh-token-id",
  refreshTokenExpiresAt: oneHourInFuture,
  client,
  user: { id: "user-id" },
  scopes: [],
});

describe("JwtRefreshTokenEncoder", () => {
  const jwtService = new JwtService("test-secret-please-do-not-use");
  const encoder = new JwtRefreshTokenEncoder(jwtService, " ");

  it("issues and resolves a refresh token roundtrip", async () => {
    const client = buildClient();
    const token = buildToken(client);
    const scopes = buildScopes();

    const encoded = await encoder.issue(client, token, scopes);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const { payload, token: resolvedToken } = await encoder.resolve(encoded);
    expect(resolvedToken).toBeNull();
    expect(payload.client_id).toBe(client.id);
    expect(payload.access_token_id).toBe(token.accessToken);
    expect(payload.refresh_token_id).toBe(token.refreshToken);
    expect(payload.user_id).toBe(token.user?.id);
    expect(payload.scope).toBe("read write");
    expect(payload.expire_time).toBe(Math.ceil(oneHourInFuture.getTime() / 1000));
  });

  it("falls back to access token expiry when refresh expiry is missing", async () => {
    const client = buildClient();
    const token = buildToken(client);
    token.refreshTokenExpiresAt = undefined;
    const scopes = buildScopes();

    const encoded = await encoder.issue(client, token, scopes);
    const { payload } = await encoder.resolve(encoded);
    expect(payload.expire_time).toBe(Math.ceil(token.accessTokenExpiresAt.getTime() / 1000));
  });

  it("throws Cannot verify the refresh token when signature is invalid", async () => {
    const client = buildClient();
    const token = buildToken(client);
    const scopes = buildScopes();

    const encoded = await encoder.issue(client, token, scopes);

    const otherEncoder = new JwtRefreshTokenEncoder(new JwtService("a-different-secret-key"), " ");

    await expect(otherEncoder.resolve(encoded)).rejects.toMatchObject({
      message: expect.stringContaining("Cannot verify the refresh token"),
    });
    await expect(otherEncoder.resolve(encoded)).rejects.toBeInstanceOf(OAuthException);
  });

  it("throws Cannot decrypt the refresh token for a malformed token", async () => {
    await expect(encoder.resolve("not-a-real-jwt")).rejects.toMatchObject({
      message: expect.stringContaining("Cannot decrypt the refresh token"),
    });
    await expect(encoder.resolve("not-a-real-jwt")).rejects.toBeInstanceOf(OAuthException);
  });
});

describe("OpaqueRefreshTokenEncoder", () => {
  const encoder = new OpaqueRefreshTokenEncoder(inMemoryAccessTokenRepository);

  beforeEach(() => {
    inMemoryDatabase.flush();
  });

  it("issues by returning the entity's refresh token raw", async () => {
    const client = buildClient();
    const token = buildToken(client);

    const issued = await encoder.issue(client, token, buildScopes());
    expect(issued).toBe(token.refreshToken);
  });

  it("resolves by fetching the entity from the repository", async () => {
    const client = buildClient();
    const token = buildToken(client);
    inMemoryDatabase.tokens[token.accessToken] = token;

    const { payload, token: resolvedToken } = await encoder.resolve(token.refreshToken as string);
    expect(resolvedToken).toBe(token);
    expect(payload.refresh_token_id).toBe(token.refreshToken);
    expect(payload.client_id).toBe(client.id);
    expect(payload.expire_time).toBe(Math.ceil((token.refreshTokenExpiresAt as Date).getTime() / 1000));
  });

  it("returns null expire_time when refresh expiry is missing", async () => {
    const client = buildClient();
    const token = buildToken(client);
    token.refreshTokenExpiresAt = null;
    inMemoryDatabase.tokens[token.accessToken] = token;

    const { payload } = await encoder.resolve(token.refreshToken as string);
    expect(payload.expire_time).toBeNull();
  });

  it("throws when the entity is missing", async () => {
    await expect(encoder.resolve("does-not-exist")).rejects.toThrow("token not found");
  });
});
