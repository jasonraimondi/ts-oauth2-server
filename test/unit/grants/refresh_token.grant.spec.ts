import { DateInterval } from "~/authorization_server";
import { OAuthAccessToken } from "~/entities/access_token.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";
import { ClientCredentialsGrant } from "~/grants/client_credentials.grant";
import { RefreshTokenGrant } from "~/grants/refresh_token.grant";
import { OAuthRequest } from "~/requests/request";
import { OAuthResponse } from "~/responses/response";
import { JWT } from "~/utils/jwt";
import { inMemoryDatabase } from "../../../examples/in_memory/database";
import { clientCredentialsGrant } from "../../../examples/in_memory/oauth_authorization_server";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryRefreshTokenRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import { expectTokenResponse } from "./client_credentials.grant.spec";

describe("refresh_token grant", () => {
  let client: OAuthClient;
  let grant: RefreshTokenGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

    client = {
      id: "a854eb18-c3df-41a3-ab6b-5d96f787f105",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["refresh_token"],
    };

    grant = new RefreshTokenGrant(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryRefreshTokenRepository,
      inMemoryAuthCodeRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JWT("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
  });

  it("successfully grants using basic auth", async () => {
    // arrange
    const accessToken: OAuthAccessToken = {
      client,
      expiresAt: DateInterval.getDateEnd("1h"),
      scopes: [],
      token: "176fa0a5-acc7-4ef7-8ff3-17cace20f83e",
    };
    const refreshToken: OAuthRefreshToken = {
      refreshToken: "8a0d01db-4da7-4250-8f18-f6c096b1912e",
      accessToken,
      expiresAt: DateInterval.getDateEnd("1h"),
    };
    inMemoryDatabase.accessTokens[accessToken.token] = accessToken;
    inMemoryDatabase.refreshTokens[refreshToken.refreshToken] = refreshToken;
    const bearerResponse = await grant.makeBearerTokenResponse(client, accessToken, refreshToken);

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
