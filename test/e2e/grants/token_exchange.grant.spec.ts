import { beforeEach, describe, expect, it } from "vitest";
import { decode } from "jsonwebtoken";
import { inMemoryDatabase } from "../_helpers/in_memory/database.js";
import {
  AuthorizationServerOptions,
  base64encode,
  TokenExchangeGrant,
  DateInterval,
  ExtraAccessTokenFieldArgs,
  JwtService,
  OAuthClient,
  OAuthRequest,
  REGEX_ACCESS_TOKEN,
  ResponseInterface,
  ProcessTokenExchangeFn,
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

class TokenExchangeJwtService extends JwtService {
  async extraTokenFields({ client }: ExtraAccessTokenFieldArgs) {
    return {
      client_id: client.id,
    };
  }
}

const processTokenExchangeFn: ProcessTokenExchangeFn = async ({ subjectToken, subjectTokenType }) => {
  if (subjectToken === "valid-token" && subjectTokenType === "urn:ietf:params:oauth:token-type:access_token") {
    return { id: "1", name: "test user" };
  }
  throw new Error("Invalid JASON");
};

function createGrant(options?: Partial<AuthorizationServerOptions>) {
  return new TokenExchangeGrant(
    processTokenExchangeFn,
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    new TokenExchangeJwtService("secret-key"),
    { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, ...options },
  );
}

describe("token_exchange grant", () => {
  let client: OAuthClient;
  let grant: TokenExchangeGrant;

  let request: OAuthRequest;

  beforeEach(() => {
    request = new OAuthRequest();

    client = {
      id: "1",
      name: "test client",
      redirectUris: ["http://localhost"],
      allowedGrants: ["urn:ietf:params:oauth:grant-type:token-exchange"],
      scopes: [],
    };

    grant = createGrant();

    inMemoryDatabase.clients[client.id] = client;
  });

  it("successfully grants using body", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
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

  it("includes extra fields from TokenExchangeJwtService.extraTokenFields", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = await grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    const decodedToken = expectTokenResponse(tokenResponse);
    expect(decodedToken.client_id).toBe(client.id);
  });

  it("successfully grants using body with scopes", async () => {
    // arrange
    const scope1 = { name: "scope-1" };
    const scope2 = { name: "scope-2" };
    inMemoryDatabase.scopes["scope-1"] = scope1;
    inMemoryDatabase.scopes["scope-2"] = scope2;
    client.scopes = [scope1, scope2];
    inMemoryDatabase.clients[client.id] = client;

    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
        scope: "scope-1 scope-2",
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
    expect(tokenResponse.body.refresh_token).toBeUndefined();
    expect(tokenResponse.body.scope).toBe("scope-1 scope-2");
  });

  it("throws for invalid scope", async () => {
    // arrange
    inMemoryDatabase.scopes["scope-1"] = { name: "scope-1" };
    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
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

  it("throws when requesting scope that client should not be able to access", async () => {
    // arrange
    const scope1 = { name: "scope-1" };
    const scope2 = { name: "scope-2" };
    inMemoryDatabase.scopes["scope-1"] = scope1;
    inMemoryDatabase.scopes["scope-2"] = scope2;

    client.scopes = [scope1]; // Client only allowed to use scope-1
    inMemoryDatabase.clients[client.id] = client;

    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
        scope: "scope-1 scope-2", // Client only allowed scope-1
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(
      /Unauthorized scope requested by the client: scope-2/,
    );
  });

  it("throws if missing subject_token", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/subject_token is required/);
  });

  it("throws if missing subject_token_type", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/subject_token_type is required in format/);
  });

  it("throws if invalid subject_token_type", async () => {
    // arrange
    request = new OAuthRequest({
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: client.id,
        subject_token: "valid-token",
        subject_token_type: "foobarbaz",
      },
    });
    const accessTokenTTL = new DateInterval("1h");

    // act
    const tokenResponse = grant.respondToAccessTokenRequest(request, accessTokenTTL);

    // assert
    await expect(tokenResponse).rejects.toThrowError(/subject_token_type is required in format/);
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
});
