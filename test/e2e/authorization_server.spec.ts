import { beforeEach, describe, expect, it } from "vitest";
import { decode } from "jsonwebtoken";

import { inMemoryDatabase } from "./_helpers/in_memory/database.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "./_helpers/in_memory/repository.js";
import {
  AuthorizationRequest,
  AuthorizationServer,
  base64encode,
  DateInterval,
  IAuthCodePayload,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthScope,
  OAuthToken,
  OAuthUser,
  RefreshTokenGrant,
} from "../../src/index.js";
import { expectTokenResponse } from "./grants/client_credentials.grant.spec.js";

// const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
const codeChallenge = "hA3IxucyJC0BsZH9zdYvGeK0ck2dC-seLBn20l18Iws"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest());

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
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      new JwtService("secret-key"),
    );
    authorizationServer.enableGrantType({
      grant: "authorization_code",
      authCodeRepository: inMemoryAuthCodeRepository,
      userRepository: inMemoryUserRepository,
    });
    authorizationServer.enableGrantType("client_credentials");
    authorizationServer.enableGrantType("implicit");
    authorizationServer.enableGrantType({
      grant: "password",
      userRepository: inMemoryUserRepository,
    });
    authorizationServer.enableGrantType("refresh_token");
    refreshGrant = authorizationServer.getGrant<RefreshTokenGrant>("refresh_token");

    user = { id: "abc123" };
    scope1 = { name: "scope-1" };
    scope2 = { name: "scope-2" };
    client = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [],
    };
    inMemoryDatabase.scopes[scope1.name] = scope1;
    inMemoryDatabase.scopes[scope2.name] = scope2;
    inMemoryDatabase.users[user.id] = user;
  });

  it("can enable client_credentials grant", async () => {
    // arrange
    inMemoryDatabase.clients[client.id] = client;

    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    const request = new OAuthRequest({
      headers: {
        authorization: basicAuth,
      },
      body: {
        grant_type: "client_credentials",
      },
    });

    // act
    const tokenResponse = await authorizationServer.respondToAccessTokenRequest(request);

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
    const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);
    const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.get("code")));

    expect(decodedCode.client_id).toBe(client.id);
    expect(decodedCode.redirect_uri).toBe("http://localhost");
  });

  it("throws if requested grant type is not enabled", async () => {
    authorizationServer = new AuthorizationServer(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      new JwtService("secret-key"),
    );
    authorizationServer.enableGrantType("refresh_token");
    const request = new OAuthRequest({
      query: {
        response_type: "code",
        client_id: client.id,
      },
    });

    // act & assert
    expect(() => authorizationServer.validateAuthorizationRequest(request)).toThrowError(/unsupported grant_type/);
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

    it("auth server that does not requirePKCE succeeds for request without code_challenge", async () => {
      authorizationServer = new AuthorizationServer(
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService("secret-key"),
        {
          requiresPKCE: false,
        },
      );
      authorizationServer.enableGrantType({
        grant: "authorization_code",
        authCodeRepository: inMemoryAuthCodeRepository,
        userRepository: inMemoryUserRepository,
      });
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
      const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.get("code")));
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://localhost");
      expect(decodedCode.code_challenge).toBeUndefined();
    });

    it("auth server requiring pkce throws if request is missing code_challenge", async () => {
      authorizationServer = new AuthorizationServer(
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService("secret-key"),
      );
      authorizationServer.enableGrantType({
        grant: "authorization_code",
        authCodeRepository: inMemoryAuthCodeRepository,
        userRepository: inMemoryUserRepository,
      });
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

    // act
    const tokenResponse = await authorizationServer.respondToAccessTokenRequest(request);

    // assert
    expectTokenResponse(tokenResponse);
    expect(tokenResponse.body.scope).toBe("scope-1");
  });
});
