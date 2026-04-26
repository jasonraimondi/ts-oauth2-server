import { beforeEach, describe, expect, it } from "vitest";

import { inMemoryDatabase } from "../_helpers/in_memory/database.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../_helpers/in_memory/repository.js";
import {
  AuthCodeGrant,
  AuthorizationRequest,
  DateInterval,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthScope,
  OAuthToken,
  OAuthUser,
  RefreshTokenGrant,
} from "../../../src/index.js";
import { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "../../../src/options.js";

/**
 * Backwards-compatibility regression tests covering the documented protected
 * extension points on AbstractGrant and AuthCodeGrant. These hooks have been
 * stable across versions; the encoder strategy refactor must dispatch through
 * them so subclass overrides continue to participate.
 */
describe("subclass override BC for protected grant hooks", () => {
  describe("RefreshTokenGrant — JWT mode", () => {
    let user: OAuthUser;
    let client: OAuthClient;
    let accessToken: OAuthToken;
    let scope1: OAuthScope;

    beforeEach(() => {
      scope1 = { name: "scope-1" };
      client = {
        id: "subclass-bc-client",
        name: "subclass bc client",
        secret: "super-secret",
        redirectUris: ["http://localhost"],
        allowedGrants: ["refresh_token"],
        scopes: [scope1],
      };
      user = { id: "subclass-bc-user" };
      accessToken = {
        accessToken: "subclass-bc-access-token",
        accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
        refreshToken: "subclass-bc-refresh-token",
        refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
        client,
        user,
        scopes: [scope1],
      };
      inMemoryDatabase.scopes[scope1.name] = scope1;
      inMemoryDatabase.clients[client.id] = client;
      inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;
    });

    it("subclass override of encryptRefreshToken is dispatched from makeBearerTokenResponse", async () => {
      const invocations: Array<{ client: OAuthClient; refreshToken: OAuthToken; scopes: OAuthScope[] }> = [];

      class OverridingRefreshTokenGrant extends RefreshTokenGrant {
        protected async encryptRefreshToken(c: OAuthClient, t: OAuthToken, s: OAuthScope[]): Promise<string> {
          invocations.push({ client: c, refreshToken: t, scopes: s });
          return "subclass-override-refresh-token";
        }
      }

      const grant = new OverridingRefreshTokenGrant(
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService("secret-key"),
        { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, useOpaqueRefreshTokens: false },
      );

      const response = await grant.makeBearerTokenResponse(client, accessToken, [scope1]);

      expect(invocations).toHaveLength(1);
      expect(invocations[0].client).toBe(client);
      expect(invocations[0].refreshToken).toBe(accessToken);
      expect(response.body.refresh_token).toBe("subclass-override-refresh-token");
    });

    it("subclass override of decrypt is dispatched when validating an old JWT refresh token", async () => {
      const decryptInvocations: string[] = [];

      class OverridingRefreshTokenGrant extends RefreshTokenGrant {
        protected async decrypt(rawToken: string): Promise<Record<string, unknown>> {
          decryptInvocations.push(rawToken);
          return super.decrypt(rawToken);
        }
      }

      const grant = new OverridingRefreshTokenGrant(
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService("secret-key"),
        { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, useOpaqueRefreshTokens: false },
      );

      const issued = await grant.makeBearerTokenResponse(client, accessToken, [scope1]);
      expect(decryptInvocations).toHaveLength(0);

      const refreshRequest = new OAuthRequest({
        body: {
          grant_type: "refresh_token",
          client_id: client.id,
          client_secret: client.secret,
          refresh_token: issued.body.refresh_token,
        },
      });

      await grant.respondToAccessTokenRequest(refreshRequest, new DateInterval("1h"));

      expect(decryptInvocations).toHaveLength(1);
      expect(decryptInvocations[0]).toBe(issued.body.refresh_token);
    });
  });

  describe("AuthCodeGrant — JWT mode", () => {
    const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA";
    const codeChallenge = "hA3IxucyJC0BsZH9zdYvGeK0ck2dC-seLBn20l18Iws";

    let user: OAuthUser;
    let client: OAuthClient;
    let scope1: OAuthScope;

    beforeEach(() => {
      user = { id: "subclass-bc-user", email: "user@example.com" };
      scope1 = { name: "scope-1" };
      client = {
        id: "subclass-bc-auth-code-client",
        name: "subclass bc auth code client",
        secret: undefined,
        redirectUris: ["http://example.com"],
        allowedGrants: ["authorization_code"],
        scopes: [scope1],
      };
      inMemoryDatabase.users[user.id] = user;
      inMemoryDatabase.scopes[scope1.name] = scope1;
      inMemoryDatabase.clients[client.id] = client;
    });

    it("subclass overrides of encrypt and decrypt are dispatched on auth code issue and resolve", async () => {
      const encryptInvocations: Array<string | Buffer | Record<string, unknown>> = [];
      const decryptInvocations: string[] = [];

      class OverridingAuthCodeGrant extends AuthCodeGrant {
        protected encrypt(payload: string | Buffer | Record<string, unknown>): Promise<string> {
          encryptInvocations.push(payload);
          return super.encrypt(payload);
        }

        protected async decrypt(rawCode: string): Promise<Record<string, unknown>> {
          decryptInvocations.push(rawCode);
          return super.decrypt(rawCode);
        }
      }

      const grant = new OverridingAuthCodeGrant(
        inMemoryAuthCodeRepository,
        inMemoryUserRepository,
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService("secret-key"),
        { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, useOpaqueAuthorizationCodes: false },
      );

      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.user = user;
      authorizationRequest.scopes = [scope1];

      // Issue: produces a JWT auth code via this.encrypt(...)
      const authCodesBeforeEncrypt = encryptInvocations.length;
      const issuedResponse = (await grant.completeAuthorizationRequest(authorizationRequest)) as any;
      expect(encryptInvocations.length).toBeGreaterThan(authCodesBeforeEncrypt);

      // Pull the issued code out of the redirect URL
      const redirectUrl = new URL(issuedResponse.headers.location);
      const issuedCode = redirectUrl.searchParams.get("code");
      expect(issuedCode).toBeTruthy();

      // Resolve: drive respondToAccessTokenRequest, which routes through this.decrypt(...)
      const accessTokenRequest = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          client_id: client.id,
          code: issuedCode,
          redirect_uri: "http://example.com",
          code_verifier: codeVerifier,
        },
      });

      await grant.respondToAccessTokenRequest(accessTokenRequest, new DateInterval("1h"));

      expect(decryptInvocations).toContain(issuedCode);
    });
  });
});
