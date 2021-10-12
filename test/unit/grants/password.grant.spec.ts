import { inMemoryDatabase } from "../../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryDeviceCodeRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import {
  DateInterval,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthResponse,
  OAuthUser,
  PasswordGrant,
  REGEX_ACCESS_TOKEN,
} from "../../../src";
import { expectTokenResponse } from "./client_credentials.grant.spec";

describe("password grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;

  let grant: PasswordGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

    user = {
      id: "512ab9a4-c786-48a6-8ad6-94c53a8dc651",
      password: "password123",
    };
    client = {
      id: "35615f2f-13fa-4731-83a1-9e34556ab390",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["password"],
      scopes: [],
    };

    grant = new PasswordGrant(
      inMemoryAuthCodeRepository,
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      inMemoryDeviceCodeRepository,
      new JwtService("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.id] = user;
  });

  it("succeeds when valid request", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "password",
        client_id: client.id,
        client_secret: client.secret,
        username: user.id,
        password: user.password,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
  });

  it("throws when missing grant_type", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: undefined,
        client_id: client.id,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Check the `grant_type` parameter/);
  });

  it("throws when missing username", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "password",
        client_id: client.id,
        client_secret: client.secret,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Check the `username` parameter/);
  });

  it("throws when missing password", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "password",
        client_id: client.id,
        client_secret: client.secret,
        username: user.id,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Check the `password` parameter/);
  });

  it("throws if no user is returned", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "password",
        client_id: client.id,
        client_secret: client.secret,
        username: "this user does not exist",
        password: "password123",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(
      /The provided authorization grant \(e\.g\., authorization_code, client_credentials\) or refresh token is invalid/,
    );
  });
});
