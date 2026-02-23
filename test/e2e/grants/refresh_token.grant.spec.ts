import { beforeEach, describe, expect, it, vi } from "vitest";
import { inMemoryDatabase } from "../_helpers/in_memory/database.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
} from "../_helpers/in_memory/repository.js";
import {
  AuthorizationServerOptions,
  DateInterval,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthScope,
  OAuthToken,
  OAuthUser,
  RefreshTokenGrant,
  REGEX_ACCESS_TOKEN,
} from "../../../src/index.js";
import { expectTokenResponse } from "../_helpers/assertions.js";
import { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "../../../src/options.js";

function createGrant(options?: Partial<AuthorizationServerOptions>) {
  return new RefreshTokenGrant(
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    new JwtService("secret-key"),
    { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, ...options },
  );
}

describe.each([true, false])("refresh_token grant (opaqueRefreshTokens: %s)", opaqueRefreshTokens => {
  let user: OAuthUser;
  let client: OAuthClient;
  let accessToken: OAuthToken;
  let scope1: OAuthScope;
  let scope2: OAuthScope;

  let grant: RefreshTokenGrant;

  let request: OAuthRequest;

  beforeEach(() => {
    request = new OAuthRequest();

    scope1 = { name: "scope-1" };
    scope2 = { name: "scope-2" };
    client = {
      id: "a854eb18-c3df-41a3-ab6b-5d96f787f105",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["refresh_token"],
      scopes: [scope1, scope2],
    };
    user = {
      id: "mock-user-id",
    };
    accessToken = {
      accessToken: "176fa0a5-acc7-4ef7-8ff3-17cace20f83e",
      accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
      refreshToken: "8a0d01db-4da7-4250-8f18-f6c096b1912e",
      refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
      user,
      client,
      scopes: [scope1, scope2],
      originatingAuthCodeId: "my-super-secret-auth-code",
    };
    inMemoryDatabase.scopes[scope1.name] = scope1;
    inMemoryDatabase.scopes[scope2.name] = scope2;
    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

    grant = createGrant({ useOpaqueRefreshTokens: opaqueRefreshTokens });
  });

  it("successful with scope", async () => {
    // arrange
    accessToken.originatingAuthCodeId = undefined; // Reset to undefined for this test
    const bearerResponse = await grant.makeBearerTokenResponse(client, accessToken);
    request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: bearerResponse.body.refresh_token,
        scope: "scope-1",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    const extraJwtFieldsSpy = vi.spyOn(grant as any, "extraJwtFields");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.scope).toBe("scope-1");
    expect(tokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
    expect(extraJwtFieldsSpy).toHaveBeenCalledWith(request, client, user, undefined);
  });

  it("provides originatingAuthCodeId as argument to extraJwtFields", async () => {
    accessToken.originatingAuthCodeId = "my-super-secret-auth-code";

    // arrange
    const bearerResponse = await grant.makeBearerTokenResponse(client, accessToken);
    request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: bearerResponse.body.refresh_token,
        scope: "scope-1",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    const extraJwtFieldsSpy = vi.spyOn(grant as any, "extraJwtFields");

    await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    expect(extraJwtFieldsSpy).toHaveBeenCalledWith(request, client, user, "my-super-secret-auth-code");
  });

  it("populates originatingAuthCodeId property in OAuthToken object", async () => {
    // arrange
    const bearerResponse = await grant.makeBearerTokenResponse(client, accessToken);
    request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: bearerResponse.body.refresh_token,
        scope: "scope-1",
      },
    });

    const persistAccessToken = vi.spyOn(inMemoryAccessTokenRepository, "persist");
    const issueRefreshToken = vi.spyOn(inMemoryAccessTokenRepository, "issueRefreshToken");

    /**
     * it would be easier to simply use `toHaveBeenCalledWith` for assertion but vitest only stores the values by reference hence
     * only get the latest state of the request params. [ref](https://github.com/vitest-dev/vitest/issues/7229)
     *
     * This makes an assertion on the `token` object imposible via `toHaveBeenCalledWith` as it is mutated several times and we would only assert the last state.
     */

    persistAccessToken.mockImplementationOnce(async it => {
      expect(it).toMatchObject({
        accessToken: "new token",
        originatingAuthCodeId: "my-super-secret-auth-code",
      });

      inMemoryAccessTokenRepository.persist(it);
    });

    issueRefreshToken.mockImplementationOnce(async (token, client) => {
      expect(token).toMatchObject({
        accessToken: "new token",
        originatingAuthCodeId: "my-super-secret-auth-code",
      });

      return inMemoryAccessTokenRepository.issueRefreshToken(token, client);
    });

    const tokenResponse = await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

    expectTokenResponse(tokenResponse);

    /**
     * the methods are actually only called once in the actual implementation but since our mock implementaion
     * also calls the original method, they get called twice.
     */
    expect(persistAccessToken).toHaveBeenCalledTimes(2);
    expect(issueRefreshToken).toHaveBeenCalledTimes(2);
  });

  it("successful without scope", async () => {
    // arrange
    const bearerResponse = await grant.makeBearerTokenResponse(client, accessToken);
    request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: bearerResponse.body.refresh_token,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.scope).toBe(accessToken.scopes.map(s => s.name).join(" "));
    expect(tokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
  });

  it.skipIf(opaqueRefreshTokens)("throws for resigned token", async () => {
    // arrange
    const jwt = new JwtService("different secret");
    const bearerResponse = await grant.makeBearerTokenResponse(client, accessToken);
    // @ts-ignore
    const decoded: any = await jwt.decode(bearerResponse.body.refresh_token);
    decoded.expire_time = decoded.expire_time + 10000000; // extend the expire date
    decoded.scope = "admin made-up-scope";
    const reEncodedToken = await jwt.sign(decoded);

    request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: reEncodedToken,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Cannot verify the refresh token/);
  });

  it("throws for invalid refresh token format", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: "invalid-token-that-is-not-decrypted",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    if (opaqueRefreshTokens) {
      await expect(tokenResponse).rejects.toThrowError("token not found");
    } else {
      await expect(tokenResponse).rejects.toThrowError(/Cannot decrypt the refresh token/);
    }
  });
});
