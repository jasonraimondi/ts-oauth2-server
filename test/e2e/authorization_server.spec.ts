import { beforeEach, describe, expect, it } from "vitest";
import jwt, { decode } from "jsonwebtoken";

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
  OAuthResponse,
  OAuthScope,
  OAuthToken,
  OAuthUser,
  ParsedAccessToken,
  ParsedRefreshToken,
  RefreshTokenGrant,
  RequestInterface,
  ResponseInterface,
} from "../../src/index.js";
import { expectTokenResponse } from "./_helpers/assertions.js";
import { CustomGrant } from "../../src/grants/abstract/custom.grant.js";
import { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "../../src/options.js";
import { OAuthAuthCode } from "@jmondi/oauth2-server";
import { testingJwtService } from "./_helpers/in_memory/oauth_authorization_server.js";

const codeChallenge = "hA3IxucyJC0BsZH9zdYvGeK0ck2dC-seLBn20l18Iws";

export class MyCustomGrant extends CustomGrant {
  readonly identifier = "custom:my_custom_grant";

  async respondToAccessTokenRequest(_req: RequestInterface, _accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    return new OAuthResponse({
      body: {
        did_it_work: "yes",
      },
    });
  }
}

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
    authorizationServer.enableGrantType("implicit");
    authorizationServer.enableGrantType({
      grant: "password",
      userRepository: inMemoryUserRepository,
    });
    const customGrant = new MyCustomGrant(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      new JwtService("secret-key"),
      DEFAULT_AUTHORIZATION_SERVER_OPTIONS,
    );
    authorizationServer.enableGrantType({ grant: customGrant });
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

  it("can respond to client_credentials grant", async () => {
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

  it("can respond to custom_grant", async () => {
    inMemoryDatabase.clients[client.id] = client;

    const request = new OAuthRequest({
      body: {
        grant_type: "custom:my_custom_grant",
      },
    });
    const tokenResponse = await authorizationServer.respondToAccessTokenRequest(request);

    expect(tokenResponse.body.did_it_work).toBe("yes");
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

  it("completeAuthorizationRequest", async () => {
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
    const request = new OAuthRequest({
      query: {
        response_type: "code",
        client_id: client.id,
      },
    });

    // act & assert
    expect(() => authorizationServer.validateAuthorizationRequest(request)).toThrowError(/Unsupported grant_type/);
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

  describe("#introspect", () => {
    let client: OAuthClient = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [],
    };
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);

    let accessToken: OAuthToken;
    let request: OAuthRequest;

    // Signed with the server's own secret: introspection/revocation verify the
    // signature before trusting any claim, so unverifiable fixtures resolve to
    // active:false / a silent no-op.
    const accessTokenJWT = jwt.sign(
      {
        email: "jason@raimondi.us",
        client: "Svelte Kit",
        cid: "16c11812-89da-4d68-9e9c-7715323e34f5",
        scope: "",
        sub: "0190efe7-7503-7dd2-8516-6375fd5de88b",
        exp: 1722569446,
        nbf: 1722565846,
        iat: 1722565846,
        jti: "d71e27d7b1ca473d315bbc95534888a8074957b5cb82d9a77d386689b54970626eb377e2bc0f9ddc",
      },
      "secret-key",
    );
    const parsedAccessToken = jwt.decode(accessTokenJWT) as ParsedAccessToken;
    const refreshTokenJWT = jwt.sign(
      {
        client_id: "16c11812-89da-4d68-9e9c-7715323e34f5",
        access_token_id: "d71e27d7b1ca473d315bbc95534888a8074957b5cb82d9a77d386689b54970626eb377e2bc0f9ddc",
        refresh_token_id: "974106e60bd94a59314c31369d9ad84ef05570abfd77bfab4be10f32f9041d0e2df316bf6139f2b8",
        scope: "",
        user_id: "0190efe7-7503-7dd2-8516-6375fd5de88b",
        expire_time: 1722573047,
        iat: 1722565846,
      },
      "secret-key",
    );
    const parsedRefreshToken = jwt.decode(refreshTokenJWT) as ParsedRefreshToken;

    beforeEach(() => {
      inMemoryDatabase.clients[client.id] = client;
    });

    describe("without option authenticateIntrospect=false", () => {
      it("does not require client credentials", async () => {
        authorizationServer = new AuthorizationServer(
          inMemoryClientRepository,
          inMemoryAccessTokenRepository,
          inMemoryScopeRepository,
          new JwtService("secret-key"),
          {
            authenticateIntrospect: false,
          },
        );

        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        const request = new OAuthRequest({
          headers: {},
          body: {
            token: accessTokenJWT,
            token_type_hint: "access_token",
          },
        });

        const response = await authorizationServer.introspect(request);

        expect(response.body.active).toBe(true);
        expect(response.body.cid).toBe("16c11812-89da-4d68-9e9c-7715323e34f5");
        expect(response.body.client).toBe("Svelte Kit");
      });
    });

    describe("with invalid auth", () => {
      beforeEach(() => {
        request = new OAuthRequest({
          headers: {},
        });
      });

      it("rejects with 401 invalid_client when missing client id and secret", async () => {
        request.body = { grant_type: "client_credentials" };

        await expect(authorizationServer.introspect(request)).rejects.toMatchObject({
          status: 401,
          errorType: "invalid_client",
        });
      });
    });

    describe("with valid auth", () => {
      beforeEach(() => {
        request = new OAuthRequest({
          headers: {
            authorization: basicAuth,
          },
        });
      });

      it("throws when missing token param", async () => {
        request.body = { grant_type: "client_credentials" };

        await expect(authorizationServer.introspect(request)).rejects.toThrowError(
          /Missing `token` parameter in request body/i,
        );
      });

      it("throws when access token and repository does not support it", async () => {
        request.body = {
          grant_type: "client_credentials",
          token: accessTokenJWT,
        };
        const backupFn = inMemoryAccessTokenRepository.getByAccessToken;
        inMemoryAccessTokenRepository.getByAccessToken = undefined;

        await expect(authorizationServer.introspect(request))
          .rejects.toThrowError(/TokenRepository#getByAccessToken is not implemented/i)
          .finally(() => {
            inMemoryAccessTokenRepository.getByAccessToken = backupFn;
          });
      });

      it("succeeds by access token", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = {
          token: accessTokenJWT,
          token_type_hint: "access_token",
        };
        const response = await authorizationServer.introspect(request);

        expect(response.body.active).toBe(true);
        expect(response.body.cid).toBe("16c11812-89da-4d68-9e9c-7715323e34f5");
        expect(response.body.client).toBe("Svelte Kit");
        expect(response.body.client_id).toBe("1");
        expect(response.body.exp).toBe(1722569446);
        expect(response.body.iat).toBe(1722565846);
        expect(response.body.jti).toBe(
          "d71e27d7b1ca473d315bbc95534888a8074957b5cb82d9a77d386689b54970626eb377e2bc0f9ddc",
        );
        expect(response.body.nbf).toBe(1722565846);
        expect(response.body.scope).toBe("");
        expect(response.body.sub).toBe("0190efe7-7503-7dd2-8516-6375fd5de88b");
        expect(response.body.token_type).toBe("access_token");
      });

      it("succeeds when access token is expired", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: new Date(0),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = {
          token: accessTokenJWT,
          token_type_hint: "access_token",
        };
        const response = await authorizationServer.introspect(request);

        expect(response.body.active).toBe(false);
      });

      it("succeeds by refresh token", async () => {
        accessToken = {
          accessToken: "176aa0a5-acc7-4ef7-8ff3-17cace20f83e",
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          refreshToken: parsedRefreshToken.refresh_token_id,
          refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = {
          token: refreshTokenJWT,
          token_type_hint: "refresh_token",
        };
        const response = await authorizationServer.introspect(request);

        expect(response.body.access_token_id).toBe(
          "d71e27d7b1ca473d315bbc95534888a8074957b5cb82d9a77d386689b54970626eb377e2bc0f9ddc",
        );
        expect(response.body.active).toBe(true);
        // the persisted row's client wins over the token's client_id claim
        expect(response.body.client_id).toBe("1");
        expect(response.body.expire_time).toBe(1722573047);
        expect(response.body.iat).toBe(1722565846);
        expect(response.body.refresh_token_id).toBe(
          "974106e60bd94a59314c31369d9ad84ef05570abfd77bfab4be10f32f9041d0e2df316bf6139f2b8",
        );
        expect(response.body.scope).toBe("");
        expect(response.body.token_type).toBe("refresh_token");
        expect(response.body.user_id).toBe("0190efe7-7503-7dd2-8516-6375fd5de88b");
      });

      it("succeeds by refresh token without a token_type_hint", async () => {
        accessToken = {
          accessToken: "176aa0a5-acc7-4ef7-8ff3-17cace20f83e",
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          refreshToken: parsedRefreshToken.refresh_token_id,
          refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = { token: refreshTokenJWT };
        const response = await authorizationServer.introspect(request);

        expect(response.body.active).toBe(true);
        expect(response.body.token_type).toBe("refresh_token");
      });

      it("returns active false for a token with an invalid signature", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        const forgedToken = jwt.sign({ ...parsedAccessToken, scope: "admin" }, "attacker-key");

        request.body = { token: forgedToken };
        const response = await authorizationServer.introspect(request);

        expect(response.body).toEqual({ active: false });
      });

      it("reports persisted scope and client_id over the token's claims", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [{ name: "scope-1" }],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        const divergedToken = jwt.sign({ ...parsedAccessToken, scope: "scope-1 scope-2 admin" }, "secret-key");

        request.body = { token: divergedToken };
        const response = await authorizationServer.introspect(request);

        expect(response.body.active).toBe(true);
        expect(response.body.scope).toBe("scope-1");
        expect(response.body.client_id).toBe("1");
      });

      it("returns active false for an unknown refresh token instead of throwing", async () => {
        request.body = { token: refreshTokenJWT, token_type_hint: "refresh_token" };

        const response = await authorizationServer.introspect(request);

        expect(response.body).toEqual({ active: false });
      });

      it("returns active false when the access token lookup rejects", async () => {
        const backupFn = inMemoryAccessTokenRepository.getByAccessToken;
        inMemoryAccessTokenRepository.getByAccessToken = async () => {
          throw new Error("token not found");
        };

        request.body = { token: accessTokenJWT };

        await expect(authorizationServer.introspect(request))
          .resolves.toMatchObject({ body: { active: false } })
          .finally(() => {
            inMemoryAccessTokenRepository.getByAccessToken = backupFn;
          });
      });

      it("returns active false when the refresh token is flag-revoked", async () => {
        accessToken = {
          accessToken: "176aa0a5-acc7-4ef7-8ff3-17cace20f83e",
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          refreshToken: parsedRefreshToken.refresh_token_id,
          refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        const backupFn = inMemoryAccessTokenRepository.isRefreshTokenRevoked;
        inMemoryAccessTokenRepository.isRefreshTokenRevoked = async () => true;
        try {
          request.body = { token: refreshTokenJWT, token_type_hint: "refresh_token" };
          const response = await authorizationServer.introspect(request);

          expect(response.body).toEqual({ active: false });
        } finally {
          inMemoryAccessTokenRepository.isRefreshTokenRevoked = backupFn;
        }
      });

      it("returns active false when the access token is flag-revoked", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        inMemoryAccessTokenRepository.isAccessTokenRevoked = async () => true;
        try {
          request.body = { token: accessTokenJWT };
          const response = await authorizationServer.introspect(request);

          expect(response.body).toEqual({ active: false });
        } finally {
          delete inMemoryAccessTokenRepository.isAccessTokenRevoked;
        }
      });
    });
  });

  describe("#revoke", () => {
    let client: OAuthClient = {
      id: "16c11812-89da-4d68-9e9c-7715323e34f5",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials", "authorization_code"],
      scopes: [],
    };
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);

    let accessToken: OAuthToken;
    let request: OAuthRequest;

    // Signed with the server's own secret: introspection/revocation verify the
    // signature before trusting any claim, so unverifiable fixtures resolve to
    // active:false / a silent no-op.
    const accessTokenJWT = jwt.sign(
      {
        email: "jason@raimondi.us",
        client: "Svelte Kit",
        cid: "16c11812-89da-4d68-9e9c-7715323e34f5",
        scope: "",
        sub: "0190efe7-7503-7dd2-8516-6375fd5de88b",
        exp: 1722569446,
        nbf: 1722565846,
        iat: 1722565846,
        jti: "d71e27d7b1ca473d315bbc95534888a8074957b5cb82d9a77d386689b54970626eb377e2bc0f9ddc",
      },
      "secret-key",
    );
    const parsedAccessToken = jwt.decode(accessTokenJWT) as ParsedAccessToken;
    const refreshTokenJWT = jwt.sign(
      {
        client_id: "16c11812-89da-4d68-9e9c-7715323e34f5",
        access_token_id: "d71e27d7b1ca473d315bbc95534888a8074957b5cb82d9a77d386689b54970626eb377e2bc0f9ddc",
        refresh_token_id: "974106e60bd94a59314c31369d9ad84ef05570abfd77bfab4be10f32f9041d0e2df316bf6139f2b8",
        scope: "",
        user_id: "0190efe7-7503-7dd2-8516-6375fd5de88b",
        expire_time: 1722573047,
        iat: 1722565846,
      },
      "secret-key",
    );
    const parsedRefreshToken = jwt.decode(refreshTokenJWT) as ParsedRefreshToken;

    beforeEach(() => {
      inMemoryDatabase.clients[client.id] = client;
    });

    describe("without option authenticateRevoke=false", () => {
      it("does not require client credentials", async () => {
        authorizationServer = new AuthorizationServer(
          inMemoryClientRepository,
          inMemoryAccessTokenRepository,
          inMemoryScopeRepository,
          new JwtService("secret-key"),
          {
            authenticateRevoke: false,
          },
        );

        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        const request = new OAuthRequest({
          headers: {},
          body: {
            token: accessTokenJWT,
            token_type_hint: "access_token",
          },
        });

        const response = await authorizationServer.revoke(request);

        expect(response.status).toBe(200);
        expect(inMemoryDatabase.tokens[accessToken.accessToken].accessTokenExpiresAt).toEqual(new Date(0));
        expect(inMemoryDatabase.tokens[accessToken.accessToken].refreshTokenExpiresAt).toEqual(new Date(0));
      });
    });

    describe("with invalid auth", () => {
      beforeEach(() => {
        request = new OAuthRequest({
          headers: {},
        });
      });

      it("rejects with 401 invalid_client when missing client id and secret", async () => {
        request.body = {};

        await expect(authorizationServer.revoke(request)).rejects.toMatchObject({
          status: 401,
          errorType: "invalid_client",
        });
      });
    });

    describe("with valid auth", () => {
      beforeEach(() => {
        request = new OAuthRequest({
          headers: {
            authorization: basicAuth,
          },
        });
      });

      it("returns 200 when missing token param (silent failure per RFC 7009)", async () => {
        request.body = { grant_type: "client_credentials" };

        const response = await authorizationServer.revoke(request);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
      });

      it("succeeds by access token", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = {
          token: accessTokenJWT,
          token_type_hint: "access_token",
        };
        const response = await authorizationServer.revoke(request);

        expect(response.status).toBe(200);
        expect(inMemoryDatabase.tokens[accessToken.accessToken].accessTokenExpiresAt).toEqual(new Date(0));
        expect(inMemoryDatabase.tokens[accessToken.accessToken].refreshTokenExpiresAt).toEqual(new Date(0));
      });

      it("succeeds when access token is expired", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: new Date(0),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = {
          token: accessTokenJWT,
          token_type_hint: "access_token",
        };
        const response = await authorizationServer.revoke(request);

        expect(response.status).toBe(200);
        expect(inMemoryDatabase.tokens[accessToken.accessToken].accessTokenExpiresAt).toEqual(new Date(0));
        expect(inMemoryDatabase.tokens[accessToken.accessToken].refreshTokenExpiresAt).toEqual(new Date(0));
      });

      it("succeeds by refresh token", async () => {
        accessToken = {
          accessToken: "176aa0a5-acc7-4ef7-8ff3-17cace20f83e",
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          refreshToken: parsedRefreshToken.refresh_token_id,
          refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = {
          token: refreshTokenJWT,
          token_type_hint: "refresh_token",
        };
        const response = await authorizationServer.revoke(request);

        expect(response.status).toBe(200);
        expect(inMemoryDatabase.tokens[accessToken.accessToken].accessTokenExpiresAt).toEqual(new Date(0));
        expect(inMemoryDatabase.tokens[accessToken.accessToken].refreshTokenExpiresAt).toEqual(new Date(0));
      });

      it("succeeds by refresh token without a token_type_hint", async () => {
        accessToken = {
          accessToken: "176aa0a5-acc7-4ef7-8ff3-17cace20f83e",
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          refreshToken: parsedRefreshToken.refresh_token_id,
          refreshTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        request.body = { token: refreshTokenJWT };
        const response = await authorizationServer.revoke(request);

        expect(response.status).toBe(200);
        expect(inMemoryDatabase.tokens[accessToken.accessToken].accessTokenExpiresAt).toEqual(new Date(0));
        expect(inMemoryDatabase.tokens[accessToken.accessToken].refreshTokenExpiresAt).toEqual(new Date(0));
      });

      it("does not revoke a token with an invalid signature", async () => {
        accessToken = {
          accessToken: parsedAccessToken.jti,
          accessTokenExpiresAt: DateInterval.getDateEnd("1h"),
          client,
          scopes: [],
        };
        inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;

        const forgedToken = jwt.sign({ ...parsedAccessToken }, "attacker-key");

        request.body = { token: forgedToken, token_type_hint: "access_token" };
        const response = await authorizationServer.revoke(request);

        expect(response.status).toBe(200);
        expect(inMemoryDatabase.tokens[accessToken.accessToken].accessTokenExpiresAt).not.toEqual(new Date(0));
      });

      it("succeeds by authorization code", async () => {
        const authCode: OAuthAuthCode = {
          code: "123445",
          client,
          scopes: [],
          expiresAt: DateInterval.getDateEnd("1h"),
        };
        inMemoryDatabase.authCodes[authCode.code] = authCode;

        const token = await testingJwtService.sign({
          auth_code_id: authCode.code,
          client_id: client.id,
        });

        request.body = {
          token,
          token_type_hint: "auth_code",
        };
        const response = await authorizationServer.revoke(request);
        expect(response.status).toBe(200);
        expect(inMemoryDatabase.authCodes[authCode.code].expiresAt).toEqual(new Date(0));
      });
    });
  });
});
