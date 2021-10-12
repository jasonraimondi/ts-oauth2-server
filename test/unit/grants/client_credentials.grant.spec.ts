import { decode } from "jsonwebtoken";
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
  base64encode,
  ClientCredentialsGrant,
  DateInterval,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthResponse,
  REGEX_ACCESS_TOKEN,
  ResponseInterface,
} from "../../../src";

export function expectTokenResponse(tokenResponse: ResponseInterface) {
  const decodedToken: any = decode(tokenResponse.body.access_token);

  expect(tokenResponse.status).toBe(200);
  expect(tokenResponse.headers["cache-control"]).toBe("no-store");
  expect(tokenResponse.headers["pragma"]).toBe("no-cache");
  expect(tokenResponse.body.token_type).toBe("Bearer");
  expect(tokenResponse.body.expires_in).toBe(3600);
  expect(tokenResponse.body.access_token).toMatch(REGEX_ACCESS_TOKEN);

  expect(decodedToken.exp).toBeTruthy();
  expect(decodedToken.jti).toBeTruthy();
}

describe("client_credentials grant", () => {
  let client: OAuthClient;
  let grant: ClientCredentialsGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

    client = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [],
    };

    grant = new ClientCredentialsGrant(
      inMemoryAuthCodeRepository,
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      inMemoryDeviceCodeRepository,
      new JwtService("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
  });

  it("successfully grants using basic auth", async () => {
    // arrange
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    request = new OAuthRequest({
      headers: {
        authorization: basicAuth,
      },
      body: {
        grant_type: "client_credentials",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.refresh_token).toBeUndefined();
  });

  it("successfully grants using body", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.refresh_token).toBeUndefined();
  });

  it("successfully grants using body with scopes", async () => {
    // arrange
    inMemoryDatabase.scopes["scope-1"] = { name: "scope-1" };
    inMemoryDatabase.scopes["scope-2"] = { name: "scope-2" };
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        scope: "scope-1 scope-2",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.refresh_token).toBeUndefined();
    expect(tokenResponse.body.scope).toBe("scope-1 scope-2");
  });

  it("throws for invalid scope", async () => {
    // arrange
    inMemoryDatabase.scopes["scope-1"] = { name: "scope-1" };
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        scope: "scope-1 this-scope-doesnt-exist",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(
      /The requested scope is invalid, unknown, or malformed: Check the `this-scope-doesnt-exist` scope/,
    );
  });

  it("throws if missing secret", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Client authentication failed/);
  });

  it("throws if missing grant_type", async () => {
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
});
