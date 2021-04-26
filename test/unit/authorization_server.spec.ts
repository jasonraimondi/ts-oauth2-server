import { decode } from "jsonwebtoken";
import querystring from "querystring";
import crypto from "crypto";

import { inMemoryDatabase } from "../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../examples/in_memory/repository";
import { AuthorizationServer } from "../../src/authorization_server";
import { OAuthClient } from "../../src/entities/client.entity";
import { OAuthScope } from "../../src/entities/scope.entity";
import { OAuthToken } from "../../src/entities/token.entity";
import { OAuthUser } from "../../src/entities/user.entity";
import { IAuthCodePayload, REGEXP_CODE_CHALLENGE } from "../../src/grants/auth_code.grant";
import { RefreshTokenGrant } from "../../src/grants/refresh_token.grant";
import { AuthorizationRequest } from "../../src/requests/authorization.request";
import { OAuthRequest } from "../../src/requests/request";
import { OAuthResponse } from "../../src/responses/response";
import { base64encode } from "../../src/utils/base64";
import { DateInterval } from "../../src/utils/date_interval";
import { JwtService } from "../../src/utils/jwt";
import { expectTokenResponse } from "./grants/client_credentials.grant.spec";

// const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
const codeChallenge = "ODQwZGM4YzZlNzMyMjQyZDAxYjE5MWZkY2RkNjJmMTllMmI0NzI0ZDlkMGJlYjFlMmMxOWY2ZDI1ZDdjMjMwYg"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));

describe("authorization_server", () => {
  let authorizationServer: AuthorizationServer;
  let refreshGrant: RefreshTokenGrant;

  let user: OAuthUser;
  let client: OAuthClient;
  let accessToken: OAuthToken;
  let scope1: OAuthScope;
  let scope2: OAuthScope;

  beforeEach(() => {
    authorizationServer = new AuthorizationServer(
      inMemoryAuthCodeRepository,
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JwtService("secret-key"),
    );
    refreshGrant = authorizationServer.getGrant("refresh_token");
    authorizationServer.enableGrantType("authorization_code");
    authorizationServer.enableGrantType("client_credentials");
    authorizationServer.enableGrantType("implicit");
    authorizationServer.enableGrantType("password");
    authorizationServer.enableGrantType("refresh_token");

    user = { id: "abc123" };
    scope1 = { name: "scope-1" };
    scope2 = { name: "scope-2" };
    inMemoryDatabase.scopes[scope1.name] = scope1;
    inMemoryDatabase.scopes[scope2.name] = scope2;
    inMemoryDatabase.users[user.id] = user;
  });

  it("can enable client_credentials grant", async () => {
    // arrange
    client = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [],
    };
    inMemoryDatabase.clients[client.id] = client;

    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    const response = new OAuthResponse();
    const request = new OAuthRequest({
      headers: {
        authorization: basicAuth,
      },
      body: {
        grant_type: "client_credentials",
      },
    });

    // act
    const tokenResponse = await authorizationServer.respondToAccessTokenRequest(request, response);

    // assert
    expectTokenResponse(tokenResponse);
  });

  it("validateAuthorizationRequest", async () => {
    client = {
      id: "authcodeclient",
      name: "test auth code client",
      secret: undefined,
      redirectUris: ["http://localhost"],
      allowedGrants: ["authorization_code"],
      scopes: [scope1, scope2],
    };
    inMemoryDatabase.clients[client.id] = client;

    const request = new OAuthRequest({
      query: {
        response_type: "code",
        client_id: client.id,
        redirect_uri: "http://localhost",
        scope: "scope-1 scope-2",
        state: "state-is-a-secret",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      },
    });
    const authorizationRequest = await authorizationServer.validateAuthorizationRequest(request);

    expect(authorizationRequest.isAuthorizationApproved).toBe(false);
    expect(authorizationRequest.client.id).toBe(client.id);
    expect(authorizationRequest.client.name).toBe(client.name);
    expect(authorizationRequest.redirectUri).toBe("http://localhost");
    expect(authorizationRequest.state).toBe("state-is-a-secret");
    expect(authorizationRequest.codeChallenge).toBe(codeChallenge);
    expect(authorizationRequest.codeChallengeMethod).toBe("S256");
    expect(authorizationRequest.scopes).toStrictEqual([scope1, scope2]);
  });

  it("is successful", async () => {
    client = {
      id: "authcodeclient",
      name: "test auth code client",
      secret: undefined,
      redirectUris: ["http://localhost"],
      allowedGrants: ["authorization_code"],
      scopes: [scope1, scope2],
    };
    inMemoryDatabase.clients[client.id] = client;

    const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://localhost");
    authorizationRequest.isAuthorizationApproved = true;
    authorizationRequest.codeChallengeMethod = "S256";
    authorizationRequest.codeChallenge = codeChallenge;
    authorizationRequest.user = user;

    const response = await authorizationServer.completeAuthorizationRequest(authorizationRequest);
    const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
    const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));

    expect(decodedCode.client_id).toBe(client.id);
    expect(decodedCode.redirect_uri).toBe("http://localhost");
    expect(decodedCode.code_challenge).toMatch(REGEXP_CODE_CHALLENGE);
  });

  describe("option requirePKCE", () => {
    beforeEach(() => {
      client = {
        id: "authcodeclient",
        name: "test auth code client",
        secret: undefined,
        redirectUris: ["http://localhost"],
        allowedGrants: ["authorization_code"],
        scopes: [scope1, scope2],
      };
      inMemoryDatabase.clients[client.id] = client;
    });

    test("auth server succeeds when skipping base64encode", async () => {
      authorizationServer = new AuthorizationServer(
        inMemoryAuthCodeRepository,
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        inMemoryUserRepository,
        new JwtService("secret-key"),
        {
          requiresPKCE: true,
          useUrlEncode: false,
        },
      );

      authorizationServer.enableGrantType("authorization_code");
      const code_verifier = crypto.randomBytes(43).toString("hex");

      const code_verifier_hash = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest("hex");

      const request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          scope: scope1.name,
          state: "state-is-a-secret",
          code_challenge_method: "s256",
          code_challenge: code_verifier_hash,
        },
      });

      // act
      const validResponse = await authorizationServer.validateAuthorizationRequest(request);
      validResponse.user = user;
      validResponse.isAuthorizationApproved = true;
      const response = await authorizationServer.completeAuthorizationRequest(validResponse);

      // assert
      const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://localhost");
      expect(decodedCode.code_challenge).toBe(code_verifier_hash);

      const oAuthResponse = new OAuthResponse({});
      const oAuthRequest = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          client_id: client.id,
          redirect_uri: "http://localhost",
          code: authorizeResponseQuery.code,
          code_verifier: code_verifier,
        },
      });
      const { status } = await authorizationServer.respondToAccessTokenRequest(oAuthRequest, oAuthResponse);

      expect(status).toBe(200);
    });

    test("auth server that does not requirePKCE succeeds for request without code_challenge", async () => {
      authorizationServer = new AuthorizationServer(
        inMemoryAuthCodeRepository,
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        inMemoryUserRepository,
        new JwtService("secret-key"),
        {
          requiresPKCE: false,
          useUrlEncode: true,
        },
      );
      authorizationServer.enableGrantType("authorization_code");
      const request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          scope: scope1.name,
          state: "state-is-a-secret",
        },
      });

      // act
      const validResponse = await authorizationServer.validateAuthorizationRequest(request);
      validResponse.user = user;
      validResponse.isAuthorizationApproved = true;
      const response = await authorizationServer.completeAuthorizationRequest(validResponse);

      // assert
      const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://localhost");
      expect(decodedCode.code_challenge).toBeUndefined();
    });

    test("auth server requiring pkce throws if request is missing code_challenge", async () => {
      authorizationServer = new AuthorizationServer(
        inMemoryAuthCodeRepository,
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        inMemoryUserRepository,
        new JwtService("secret-key"),
      );
      authorizationServer.enableGrantType("authorization_code");
      const request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          scope: scope1.name,
          state: "state-is-a-secret",
        },
      });

      // act
      const response = authorizationServer.validateAuthorizationRequest(request);

      // assert
      await expect(response).rejects.toThrowError(
        /The authorization server requires public clients to use PKCE RFC-7636/,
      );
    });
  });

  it("respondToAccessTokenRequest is successful", async () => {
    // arrange
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
    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;
    const bearerResponse = await refreshGrant.makeBearerTokenResponse(client, accessToken);
    const request = new OAuthRequest({
      body: {
        grant_type: "refresh_token",
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: bearerResponse.body.refresh_token,
        scope: "scope-1",
      },
    });
    const response = new OAuthResponse();

    // act
    const tokenResponse = await authorizationServer.respondToAccessTokenRequest(request, response);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.scope).toBe("scope-1");
  });
});
