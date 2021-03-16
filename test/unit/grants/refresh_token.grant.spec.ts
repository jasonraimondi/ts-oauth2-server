import { inMemoryDatabase } from "../../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import { REGEX_ACCESS_TOKEN } from "../../../src";
import { OAuthClient } from "../../../src/entities/client.entity";
import { OAuthScope } from "../../../src/entities/scope.entity";
import { OAuthToken } from "../../../src/entities/token.entity";
import { RefreshTokenGrant } from "../../../src/grants/refresh_token.grant";
import { OAuthRequest } from "../../../src/requests/request";
import { OAuthResponse } from "../../../src/responses/response";
import { DateInterval } from "../../../src/utils/date_interval";
import { JwtService } from "../../../src/utils/jwt";
import { expectTokenResponse } from "./client_credentials.grant.spec";

describe("refresh_token grant", () => {
  let client: OAuthClient;
  let accessToken: OAuthToken;
  let scope1: OAuthScope;
  let scope2: OAuthScope;

  let grant: RefreshTokenGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

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
    accessToken = {
      accessToken: "176fa0a5-acc7-4ef7-8ff3-17cace20f83e",
      accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
      refreshToken: "8a0d01db-4da7-4250-8f18-f6c096b1912e",
      refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
      client,
      scopes: [scope1, scope2],
    };
    inMemoryDatabase.scopes[scope1.name] = scope1;
    inMemoryDatabase.scopes[scope2.name] = scope2;
    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

    grant = new RefreshTokenGrant(
      inMemoryAuthCodeRepository,
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JwtService("secret-key"),
    );
  });

  it("successful with scope", async () => {
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

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.scope).toBe("scope-1");
    expect(tokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
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
    const tokenResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.scope).toBe(accessToken.scopes.map(s=>s.name).join(" "));
    expect(tokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
  });

  it("throws for resigned token", async () => {
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
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

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
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Cannot decrypt the refresh token/);
  });
});
