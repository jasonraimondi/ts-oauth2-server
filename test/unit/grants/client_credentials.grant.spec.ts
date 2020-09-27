import { DateInterval } from "@jmondi/date-interval";

import { ClientCredentialsGrant } from "../../../src/grants";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryRefreshTokenRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import { JWT } from "../../../examples/in_memory/oauth_authorization_server";
import { OAuthRequest } from "../../../src/requests/request";
import { OAuthResponse, ResponseInterface } from "../../../src/responses/response";
import { base64encode } from "../../../src/utils";
import { OAuthClient } from "../../../src/entities";
import { inMemoryDatabase } from "../../../examples/in_memory/database";

describe("client credentials grant", () => {
  let client: OAuthClient;
  let grant: ClientCredentialsGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

    client = {
      id: "1",
      isConfidential: false,
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
    };

    grant = new ClientCredentialsGrant(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryRefreshTokenRepository,
      inMemoryAuthCodeRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JWT("secret-key"),
    );

    inMemoryDatabase.clients.push(client);
  });

  function expectTokenResponse(clientCredentialsResponse: ResponseInterface) {
    expect(clientCredentialsResponse.status).toBe(200);
    expect(clientCredentialsResponse.headers["cache-control"]).toBe("no-store");
    expect(clientCredentialsResponse.headers["pragma"]).toBe("no-cache");
    expect(clientCredentialsResponse.body.token_type).toBe("Bearer");
    expect(clientCredentialsResponse.body.expires_in).toBe(3600);
    expect(typeof clientCredentialsResponse.body.access_token === "string").toBeTruthy();
  }

  it("can grant using basic auth", async () => {
    // arrange
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
      },
      headers: {
        authorization: basicAuth,
      },
    });
    const accessTokenTTL = new DateInterval("PT1H");

    // act
    const clientCredentialsResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(clientCredentialsResponse);
  });

  it("can grant using body", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
      },
    });
    const accessTokenTTL = new DateInterval("PT1H");

    // act
    const clientCredentialsResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(clientCredentialsResponse);
  });

  it("can grant using body with scopes", async () => {
    // arrange
    inMemoryDatabase.scopes.push({ name: "scope-1" });
    inMemoryDatabase.scopes.push({ name: "scope-2" });
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        scope: "scope-1 scope-2"
      },
    });
    const accessTokenTTL = new DateInterval("PT1H");

    // act
    const clientCredentialsResponse = await grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    expectTokenResponse(clientCredentialsResponse);
    expect(clientCredentialsResponse.body.scope).toBe("scope-1 scope-2")
  });


  it("throws for invalid scope", async () => {
    // arrange
    inMemoryDatabase.scopes.push({ name: "scope-1" });
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        scope: "scope-1 this-scope-doesnt-exist"
      },
    });
    const accessTokenTTL = new DateInterval("PT1H");

    // act
    const clientCredentialsResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(clientCredentialsResponse).rejects.toThrowError(/The requested scope is invalid, unknown, or malformed: Check the `this-scope-doesnt-exist` scope/)
  });

  it("throws if missing secret", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
      },
    });
    const accessTokenTTL = new DateInterval("PT1H");

    // act
    const clientCredentialsResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(clientCredentialsResponse).rejects.toThrowError(/Client authentication failed/);
  });

  it("throws if missing grant_type", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: undefined,
        client_id: client.id,
      },
    });
    const accessTokenTTL = new DateInterval("PT1H");

    // act
    const clientCredentialsResponse = grant.respondToAccessTokenRequest(request, response, accessTokenTTL);

    // assert
    await expect(clientCredentialsResponse).rejects.toThrowError(/The request is missing a required parameter/);
  });
});
