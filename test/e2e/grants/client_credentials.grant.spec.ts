import { beforeEach, describe, expect, it } from "vitest";
import { decode } from "jsonwebtoken";
import { inMemoryDatabase } from "../_helpers/in_memory/database.js";
import {
  AuthorizationServerOptions,
  base64encode,
  ClientCredentialsGrant,
  DateInterval,
  ExtraAccessTokenFieldArgs,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthScope,
  REGEX_ACCESS_TOKEN,
  ResponseInterface,
} from "../../../src/index.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
} from "../_helpers/in_memory/repository.js";
import { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "../../../src/options.js";

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

  return decodedToken;
}

class ClientCredentialsJwtService extends JwtService {
  async extraTokenFields({ client }: ExtraAccessTokenFieldArgs) {
    return {
      client_id: client.id,
    };
  }
}

function createGrant(options?: Partial<AuthorizationServerOptions>) {
  return new ClientCredentialsGrant(
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    new ClientCredentialsJwtService("secret-key"),
    { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, ...options },
  );
}

describe("client_credentials grant", () => {
  let client: OAuthClient;
  let grant: ClientCredentialsGrant;

  let request: OAuthRequest;

  beforeEach(() => {
    request = new OAuthRequest();

    const scope1 = { name: "scope-1" };
    const scope2 = { name: "scope-2" };

    inMemoryDatabase.scopes["scope-1"] = scope1;
    inMemoryDatabase.scopes["scope-2"] = scope2;

    client = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [scope1, scope2],
    };

    grant = createGrant({
      issuer: "TestIssuer",
    });

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
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    const decodedToken = expectTokenResponse(tokenResponse);
    expect(decodedToken.cid).toBe(client.id);
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
    grant.options.tokenCID = "name";

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    const decodedToken = expectTokenResponse(tokenResponse);
    expect(decodedToken.cid).toBe(client.name);
    expect(tokenResponse.body.refresh_token).toBeUndefined();
  });

  it("includes extra fields from ClientCredentialsJwtService.extraTokenFields", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        aud: "test-audience",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    const decodedToken = expectTokenResponse(tokenResponse);
    expect(decodedToken.client_id).toBe(client.id);
    expect(decodedToken.iss).toBe("TestIssuer");
    expect(decodedToken.aud).toStrictEqual("test-audience");
  });

  it("successfully grants using body with scopes", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        scope: "scope-1 scope-2",
        audience: ["test-audience", "test-audience-2"],
      },
    });
    grant = createGrant({
      tokenCID: "name",
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    const decodedToken = expectTokenResponse(tokenResponse);
    // defaults to name
    expect(decodedToken.cid).toBe(client.name);
    expect(decodedToken.aud).toStrictEqual(["test-audience", "test-audience-2"]);
    expect(tokenResponse.body.refresh_token).toBeUndefined();
    expect(tokenResponse.body.scope).toBe("scope-1 scope-2");
  });

  it("throws when token requests scope that client should not be able to access", async () => {
    const scope: OAuthScope = {
      id: "1",
      name: "scope-1",
    };
    const scope2: OAuthScope = {
      id: "2",
      name: "scope-2",
    };
    client = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [scope],
    };
    inMemoryDatabase.scopes[scope.id] = scope;
    inMemoryDatabase.scopes[scope2.id] = scope2;
    inMemoryDatabase.clients[client.id] = client;

    // arrange
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    request = new OAuthRequest({
      headers: {
        authorization: basicAuth,
      },
      body: {
        grant_type: "client_credentials",
        scope: "scope-2",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Unauthorized scope requested by the client: scope-2/);
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
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

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
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

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
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/Check the `grant_type` parameter/);
  });

  it("allows authentication with empty string client secret", async () => {
    // arrange
    const clientWithEmptySecret = {
      ...client,
      secret: "",
    };
    inMemoryDatabase.clients[client.id] = clientWithEmptySecret;

    request = new OAuthRequest({
      body: {
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: "",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    const decodedToken = expectTokenResponse(tokenResponse);
    expect(decodedToken.cid).toBe(client.id);
    expect(tokenResponse.body.refresh_token).toBeUndefined();
  });
});
