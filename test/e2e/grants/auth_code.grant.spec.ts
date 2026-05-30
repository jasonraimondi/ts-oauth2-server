import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateKeyPairSync } from "crypto";
import { decode } from "jsonwebtoken";

import { inMemoryDatabase } from "../_helpers/in_memory/database.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../_helpers/in_memory/repository.js";
import {
  AuthCodeGrant,
  AuthorizationRequest,
  AuthorizationServerOptions,
  base64urlencode,
  DateInterval,
  ExtraAccessTokenFieldArgs,
  IAuthCodePayload,
  JwtService,
  OAuthAuthCode,
  OAuthAuthCodeRepository,
  OAuthClient,
  OAuthException,
  OAuthRequest,
  OAuthScope,
  OAuthUser,
  OidcOptions,
  REGEX_ACCESS_TOKEN,
} from "../../../src/index.js";
import { expectTokenResponse } from "../_helpers/assertions.js";
import { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "../../../src/options.js";

export class CustomJwtService extends JwtService {
  extraTokenFields(params: ExtraAccessTokenFieldArgs) {
    return {
      email: params.user?.email,
    };
  }
}

function createGrant(options?: Partial<AuthorizationServerOptions>) {
  return new AuthCodeGrant(
    inMemoryAuthCodeRepository,
    inMemoryUserRepository,
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    new CustomJwtService("secret-key"),
    { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, ...options },
  );
}

// OIDC mandates RS256; use an asymmetric service whenever an OIDC flow signs an
// access token (typ:at+jwt) or an ID token.
const rsaPrivateKeyPem = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ format: "pem", type: "pkcs8" })
  .toString();

function createOidcGrant(options?: Partial<AuthorizationServerOptions>) {
  return new AuthCodeGrant(
    inMemoryAuthCodeRepository,
    inMemoryUserRepository,
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    new JwtService({ key: rsaPrivateKeyPem }),
    { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, ...options },
  );
}
describe("authorization_code grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;
  let scope1: OAuthScope;
  let scope2: OAuthScope;
  let grant: AuthCodeGrant;

  let request: OAuthRequest;

  const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
  const codeChallenge = "hA3IxucyJC0BsZH9zdYvGeK0ck2dC-seLBn20l18Iws"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest());

  beforeEach(() => {
    request = new OAuthRequest();

    user = { id: "abc123", email: "jason@example.com" };
    scope1 = { name: "scope-1" };
    scope2 = { name: "scope-2" };

    client = {
      id: "authcodeclient",
      name: "test auth code client",
      secret: undefined,
      redirectUris: ["http://example.com"],
      allowedGrants: ["authorization_code"],
      scopes: [scope1],
    };

    grant = createGrant({ issuer: "TestIssuer" });

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.id] = user;
    inMemoryDatabase.scopes[scope1.name] = scope1;
    inMemoryDatabase.scopes[scope2.name] = scope2;
  });

  describe("handles response_type for authorization request", () => {
    let validQueryData: any;

    beforeEach(() => {
      validQueryData = {
        response_type: "code",
        client_id: client.id,
        redirect_uri: "http://example.com",
        state: "state-is-a-secret",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      };
    });

    it("returns true for valid request", async () => {
      request = new OAuthRequest({ query: validQueryData });

      expect(grant.canRespondToAuthorizationRequest(request)).toBe(true);
    });

    it("returns false when response_type !== code", async () => {
      request = new OAuthRequest({
        query: {
          ...validQueryData,
          response_type: undefined,
        },
      });

      expect(grant.canRespondToAuthorizationRequest(request)).toBe(false);
    });
  });

  describe("validate authorization request", () => {
    it("is successful with S256 pkce", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          // single object arrays is valid
          redirect_uri: ["http://example.com"],
          state: "state-is-a-secret",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          audience: ["IAmTheMovie", "CommitToThisMemory"],
        },
      });
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://example.com");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.codeChallenge).toBe(codeChallenge);
      expect(authorizationRequest.codeChallengeMethod).toBe("S256");
      expect(authorizationRequest.scopes).toStrictEqual([]);
      expect(authorizationRequest.audience).toStrictEqual(["IAmTheMovie", "CommitToThisMemory"]);
    });

    it("throws when requesting scope that client should not be able to access", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          // single object arrays is valid
          redirect_uri: ["http://example.com"],
          state: "state-is-a-secret",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          audience: ["IAmTheMovie", "CommitToThisMemory"],
          // the client is only allowed to use scope-1
          scope: "scope-1 scope-2",
        },
      });

      await expect(() => grant.validateAuthorizationRequest(request)).rejects.toThrowError(
        /Unauthorized scope requested by the client: scope-2/,
      );
    });

    it("is successful with plain pkce", async () => {
      client.redirectUris = ["http://example.com"];
      inMemoryDatabase.clients[client.id] = client;
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          scope: "scope-1",
          state: "state-is-a-secret",
          code_challenge: codeChallenge, // code verifier plain
          code_challenge_method: "S256",
        },
      });
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://example.com");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.codeChallenge).toBe(codeChallenge);
      expect(authorizationRequest.codeChallengeMethod).toBe("S256");
      expect(authorizationRequest.scopes).toStrictEqual([{ name: "scope-1" }]);
    });

    [
      {
        testName: "is successful with redirect uri with querystring",
        allowed: ["http://oauth2.example.com"],
        received: "http://oauth2.example.com?this_should_work=true&also-this=yeah",
      },
      {
        testName: "is successful with redirect uri with port",
        allowed: ["http://oauth2.example.com/callback"],
        received: "http://oauth2.example.com:3000/callback",
      },
      {
        testName: "is successful with application style redirect uri",
        allowed: ["com.exampleapp.oauth2://callback"],
        received: "com.exampleapp.oauth2://callback",
      },
      {
        testName: "is successful with application style redirect uri with port",
        allowed: ["com.exampleapp.oauth2://callback"],
        received: "com.exampleapp.oauth2://callback:3000",
      },
    ].map(({ testName, allowed, received }) => {
      it(testName, async () => {
        client.redirectUris = allowed;
        inMemoryDatabase.clients[client.id] = client;
        request = new OAuthRequest({
          query: {
            response_type: "code",
            client_id: client.id,
            redirect_uri: received,
            scope: "scope-1",
            state: "state-is-a-secret",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
          },
        });
        const authorizationRequest = await grant.validateAuthorizationRequest(request);

        expect(authorizationRequest.redirectUri).toBe(received);
      });
    });

    it("is successful without using PKCE flow", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          scope: "scope-1",
          state: "state-is-a-secret",
        },
      });
      grant = createGrant({ requiresPKCE: false });

      // act
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      // assert
      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://example.com");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.scopes).toStrictEqual([{ name: "scope-1" }]);
    });

    it("is successful with undefined redirect_uri", async () => {
      request = new OAuthRequest({
        query: {
          redirect_uri: undefined,
          response_type: "code",
          client_id: client.id,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        },
      });
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.redirectUri).toBe("http://example.com");
    });

    it("throws when missing code_challenge pkce", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          state: "state-is-a-secret",
          code_challenge_method: "plain",
        },
      });
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(
        /The authorization server requires public clients to use PKCE RFC-7636/,
      );
    });

    it("throws for missing client_id", async () => {
      const plainCodeChallenge = "qqVDyvlSezXc64NY5Rx3BbLaT7c2xEBgoJP9domepFZLEjo9ln8EAaSdfewSNY5Rx3BbL";
      request = new OAuthRequest({
        query: {
          redirect_uri: undefined,
          response_type: "code",
          code_challenge: base64urlencode(plainCodeChallenge), // code verifier plain
        },
      });

      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(/Check the `client_id` parameter/);
    });

    it("throws when S256 is required and plain is used for code_challenge_method", async () => {
      const plainCodeChallenge = "qqVDyvlSezXc64NY5Rx3BbLaT7c2xEBgoJP9domepFZLEjo9ln8EAaSdfewSNY5Rx3BbL";
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          state: "state-is-a-secret",
          code_challenge: base64urlencode(plainCodeChallenge), // code verifier plain
          code_challenge_method: "plain",
        },
      });
      grant.options.requiresS256 = true;

      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(/Must be `S256`/);
    });

    it("throws for relative redirect_uri", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "/foobydoo",
        },
      });
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(/Check the `redirect_uri` parameter/);
    });

    it("throws for multiple redirect_uri args (array of strings)", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: ["http://example.com", "http://example2.com"],
        },
      });
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(/Check the `redirect_uri` parameter/);
    });

    it("throws for redirect_uri containing url fragment", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com#fragle",
        },
      });
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(
        /Redirection endpoint must not contain url fragment based on RFC6749/,
      );
    });
  });

  describe("complete authorization request", () => {
    it("is successful", async () => {
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.state = "abc123";
      authorizationRequest.user = user;
      authorizationRequest.audience = ["MyDinosaurLife"];
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.get("code")));

      expect(response.headers.location.includes("http://example.com?code=")).toBeTruthy();
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://example.com");
      expect(decodedCode.audience).toStrictEqual(["MyDinosaurLife"]);
    });

    it("is successful with client with query", async () => {
      client.redirectUris = ["http://example.com?this_should_work=true"];
      inMemoryDatabase.clients[client.id] = client;

      const authorizationRequest = new AuthorizationRequest(
        "authorization_code",
        client,
        "http://example.com?this_should_work=true",
      );
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.state = "abc123";
      authorizationRequest.user = user;
      authorizationRequest.audience = "EvenIfItKillsMe";
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.get("code")));

      expect(response.headers.location).toMatch(/http\:\/\/example\.com\?this_should_work=true\&code\=/);
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://example.com?this_should_work=true");
      expect(decodedCode.audience).toBe("EvenIfItKillsMe");
    });

    it("is successful without pkce flow", async () => {
      grant.options.requiresPKCE = false;
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.state = "abc123";
      authorizationRequest.user = user;
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.get("code")));

      expect(response.headers.location.includes("http://example.com?code=")).toBeTruthy();
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://example.com");
    });

    it("works with opaque authorization codes (with state)", async () => {
      grant = createGrant({ useOpaqueAuthorizationCodes: true });

      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.state = "abc123";
      authorizationRequest.user = user;
      authorizationRequest.audience = ["MyDinosaurLife"];
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);

      expect(authorizeResponseQuery.get("code")).toStrictEqual("my-super-secret-auth-code");
      expect(authorizeResponseQuery.get("state")).toStrictEqual("abc123");
    });

    it("works with opaque authorization codes (without state)", async () => {
      grant = createGrant({ useOpaqueAuthorizationCodes: true });

      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.state = undefined;
      authorizationRequest.user = user;
      authorizationRequest.audience = ["MyDinosaurLife"];
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(response.headers.location.split("?")[1]);

      expect(authorizeResponseQuery.get("code")).toStrictEqual("my-super-secret-auth-code");
      expect(authorizeResponseQuery.get("state")).toStrictEqual(null);
    });
  });

  describe.each([
    { useOpaqueAuthorizationCodes: true, useOpaqueRefreshTokens: true },
    { useOpaqueAuthorizationCodes: true, useOpaqueRefreshTokens: false },
    { useOpaqueAuthorizationCodes: false, useOpaqueRefreshTokens: true },
    { useOpaqueAuthorizationCodes: false, useOpaqueRefreshTokens: false },
  ])("respond to access token request with code (%s)", options => {
    let authorizationRequest: AuthorizationRequest;
    let authorizationCode: string;

    beforeEach(async () => {
      grant = createGrant({
        issuer: "TestIssuer",
        ...options,
      });

      authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.user = user;
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.get("code"));
    });

    it("provides originatingAuthCodeId as argument to extraJwtFields", async () => {
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier,
        },
      });

      const extraJwtFieldsSpy = vi.spyOn(grant as any, "extraJwtFields");

      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      expectTokenResponse(accessTokenResponse);
      expect(extraJwtFieldsSpy).toHaveBeenCalledWith(request, client, user, "my-super-secret-auth-code");
    });

    it("is successful with pkce S256", async () => {
      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier,
        },
      });
      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      expectTokenResponse(accessTokenResponse);
      expect(accessTokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
    });

    it("populates originatingAuthCodeId property in OAuthToken object", async () => {
      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier,
        },
      });

      const persistAccessToken = vi.spyOn(inMemoryAccessTokenRepository, "persist");
      const issueRefreshToken = vi.spyOn(inMemoryAccessTokenRepository, "issueRefreshToken");

      /**
       * it would be easier to simply use `toHaveBeenCalledWith` for assertion but vitest only stores the values by reference hence
       * only get the latest state of the request params. [ref](https://github.com/vitest-dev/vitest/issues/7229)
       *
       * This makes an assertion on the `token` object imposible via `toHaveBeenCalledWith` as it is mutated several times and we would only assert the last state.
       */

      persistAccessToken.mockImplementationOnce(async it => {
        expect(it).toMatchObject({
          accessToken: "new token",
          originatingAuthCodeId: "my-super-secret-auth-code",
        });

        inMemoryAccessTokenRepository.persist(it);
      });

      issueRefreshToken.mockImplementationOnce(async (token, client) => {
        expect(token).toMatchObject({
          accessToken: "new token",
          originatingAuthCodeId: "my-super-secret-auth-code",
        });

        return inMemoryAccessTokenRepository.issueRefreshToken(token, client);
      });

      await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      /**
       * the methods are actually only called once in the actual implementation but since our mock implementaion
       * also calls the original method, they get called twice.
       */
      expect(persistAccessToken).toHaveBeenCalledTimes(2);
      expect(issueRefreshToken).toHaveBeenCalledTimes(2);
    });

    it("is successful with pkce plain", async () => {
      authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "plain";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.user = user;
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.get("code"));

      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeChallenge,
        },
      });
      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      expectTokenResponse(accessTokenResponse);
      expect(accessTokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
    });

    it("is successful without pkce", async () => {
      grant = createGrant({ requiresPKCE: false, issuer: "TestIssuer", ...options });
      authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.get("code"));

      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          audience: "MotionCitySoundtrack",
        },
      });
      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      expectTokenResponse(accessTokenResponse);
      const decodedToken = decode(accessTokenResponse.body.access_token) as any;
      expect(decodedToken.email).toBe("jason@example.com");
      expect(decodedToken.iss).toBe("TestIssuer");
      expect(decodedToken.aud).toBe("MotionCitySoundtrack");
      expect(accessTokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
    });

    it("throws for confidential client when no secret is included in request", async () => {
      client = {
        ...client,
        secret: "auth-code-with-seccret",
      };
      inMemoryDatabase.clients[client.id] = client;

      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier + "invalid",
        },
      });
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      await expect(accessTokenResponse).rejects.toThrowError(/Client authentication failed/);
    });

    it("throws for invalid code_verifier format", async () => {
      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: "invalid",
        },
      });
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      await expect(accessTokenResponse).rejects.toThrowError(
        /Code verifier must follow the specifications of RFC-7636/,
      );
    });

    it("throws for incorrect code_verifier", async () => {
      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier + "broken",
        },
      });
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      await expect(accessTokenResponse).rejects.toThrowError(/Failed to verify code challenge/);
    });

    it("throws for invalid jwt decode", async () => {
      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier,
          code: "invalid_jwt_code",
        },
      });
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      // assert
      await expect(accessTokenResponse).rejects.toThrow(OAuthException);
    });

    it("throws if auth code is expired", async () => {
      // expire the auth code
      inMemoryDatabase.authCodes["my-super-secret-auth-code"].expiresAt = new Date("2010-12-31T23:59:59Z");

      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier,
        },
      });
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      await expect(accessTokenResponse).rejects.toThrow(OAuthException);
    });
  });

  describe("OIDC nonce, auth_time and max_age threading", () => {
    const oidcOptions: OidcOptions = {
      authorizationEndpoint: "https://issuer.example/authorize",
      tokenEndpoint: "https://issuer.example/token",
      userinfoEndpoint: "https://issuer.example/userinfo",
      jwksUri: "https://issuer.example/jwks",
      getUserClaims: async () => ({ sub: "abc123" }),
    };

    const nowSeconds = () => Math.floor(Date.now() / 1000);

    const allowOpenidScope = (): void => {
      client.scopes = [scope1, { name: "openid" }];
      inMemoryDatabase.clients[client.id] = client;
    };

    it("parses OIDC authorization parameters when request includes openid scope", async () => {
      grant = createGrant({ issuer: "TestIssuer", oidc: oidcOptions });
      allowOpenidScope();
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          scope: "openid",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          nonce: "nonce-abc",
          max_age: "300",
          prompt: "login",
          login_hint: "jason@example.com",
          display: "page",
          ui_locales: "en-US",
          acr_values: "urn:acr:1",
          id_token_hint: "prev-token",
        },
      });

      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.nonce).toBe("nonce-abc");
      expect(authorizationRequest.maxAge).toBe(300);
      expect(authorizationRequest.prompt).toBe("login");
      expect(authorizationRequest.loginHint).toBe("jason@example.com");
      expect(authorizationRequest.display).toBe("page");
      expect(authorizationRequest.uiLocales).toBe("en-US");
      expect(authorizationRequest.acrValues).toBe("urn:acr:1");
      expect(authorizationRequest.idTokenHint).toBe("prev-token");
    });

    it("ignores OIDC authorization parameters on non-openid requests", async () => {
      grant = createGrant({ issuer: "TestIssuer", oidc: oidcOptions });
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          nonce: "nonce-abc",
          max_age: "not-a-number",
          prompt: "login",
        },
      });

      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.nonce).toBeUndefined();
      expect(authorizationRequest.maxAge).toBeUndefined();
      expect(authorizationRequest.prompt).toBeUndefined();
    });

    it("leaves OIDC authorization fields undefined when OIDC is disabled", async () => {
      grant = createGrant({});
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          nonce: "nonce-abc",
          max_age: "300",
          prompt: "login",
        },
      });

      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.nonce).toBeUndefined();
      expect(authorizationRequest.maxAge).toBeUndefined();
      expect(authorizationRequest.prompt).toBeUndefined();
    });

    it("auto-injects unregistered OIDC scopes for the authorization_code grant", async () => {
      // openid/email are allowed for the client but are NOT registered scopes;
      // only the auth-code grant's OIDC auto-injection makes them valid here.
      grant = createGrant({ issuer: "TestIssuer", requiresPKCE: false, oidc: oidcOptions });
      client.scopes = [scope1, { name: "openid" }, { name: "email" }];
      inMemoryDatabase.clients[client.id] = client;
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          scope: "openid email",
        },
      });

      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      const names = authorizationRequest.scopes.map(scope => scope.name);
      expect(names).toContain("openid");
      expect(names).toContain("email");
    });

    it("threads nonce and auth_time into the issued JWT auth code", async () => {
      grant = createGrant({ issuer: "TestIssuer", requiresPKCE: false, oidc: oidcOptions });
      allowOpenidScope();
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];
      authorizationRequest.nonce = "nonce-xyz";
      authorizationRequest.authTime = nowSeconds();

      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const code = new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code");
      const decoded = decode(String(code)) as IAuthCodePayload & { nonce?: string; auth_time?: number };

      expect(decoded.nonce).toBe("nonce-xyz");
      expect(decoded.auth_time).toBe(authorizationRequest.authTime);
    });

    it("does not persist stray OIDC fields into non-openid auth codes", async () => {
      grant = createGrant({ issuer: "TestIssuer", requiresPKCE: false, oidc: oidcOptions });
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [scope1];
      authorizationRequest.nonce = "nonce-ignored";
      authorizationRequest.maxAge = 300;

      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const code = new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code");
      const decoded = decode(String(code)) as IAuthCodePayload & {
        nonce?: string;
        auth_time?: number;
        max_age?: number;
      };

      expect(decoded.scopes).toEqual([scope1.name]);
      expect(decoded.nonce).toBeUndefined();
      expect(decoded.auth_time).toBeUndefined();
      expect(decoded.max_age).toBeUndefined();
    });

    it("throws from completeAuthorizationRequest when max_age was requested without authTime", async () => {
      grant = createGrant({ issuer: "TestIssuer", requiresPKCE: false, oidc: oidcOptions });
      allowOpenidScope();
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];
      authorizationRequest.maxAge = 300;

      await expect(grant.completeAuthorizationRequest(authorizationRequest)).rejects.toThrowError(
        /max_age was requested but authTime/,
      );
    });

    it("rejects with invalid_grant when max_age freshness is exceeded at token time", async () => {
      grant = createGrant({ issuer: "TestIssuer", requiresPKCE: false, oidc: oidcOptions });
      allowOpenidScope();
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];
      authorizationRequest.maxAge = 60;
      authorizationRequest.authTime = 1000; // far in the past relative to the frozen test clock

      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const code = new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code");

      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: "http://example.com",
          client_id: client.id,
        },
      });

      await expect(grant.respondToAccessTokenRequest(request, new DateInterval("1h"))).rejects.toThrowError(
        /max_age exceeded/,
      );
    });

    it("accepts the token request when max_age freshness is satisfied", async () => {
      grant = createOidcGrant({ issuer: "https://issuer.example", requiresPKCE: false, oidc: oidcOptions });
      allowOpenidScope();
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];
      authorizationRequest.maxAge = 300;
      authorizationRequest.authTime = nowSeconds() - 10;

      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const code = new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code");

      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: "http://example.com",
          client_id: client.id,
        },
      });

      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, new DateInterval("1h"));
      expectTokenResponse(accessTokenResponse);
    });

    it("rejects with an OAuthException rather than a raw 500 when the user is absent at id_token time", async () => {
      grant = createOidcGrant({ issuer: "https://issuer.example", requiresPKCE: false, oidc: oidcOptions });
      client.scopes = [{ name: "openid" }];
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];

      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const code = new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code");

      // The user existed at authorize time but is gone by token time (deleted, or the
      // repository returns undefined). The granted openid scope still gates an ID token,
      // which must surface as an OAuthException rather than a TypeError from user!.id.
      vi.spyOn(inMemoryUserRepository, "getUserByCredentials").mockResolvedValue(undefined);

      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: "http://example.com",
          client_id: client.id,
        },
      });

      await expect(grant.respondToAccessTokenRequest(request, new DateInterval("1h"))).rejects.toThrowError(
        OAuthException,
      );
    });

    it("fails loud with invalid_grant when an opaque-code repository drops the nonce", async () => {
      const store: Record<string, OAuthAuthCode> = {};
      const forgetfulRepository: OAuthAuthCodeRepository = {
        issueAuthCode(issuingClient, issuingUser, _scopes) {
          return {
            code: "opaque-forgetful-code",
            user: issuingUser,
            client: issuingClient,
            redirectUri: "http://example.com",
            expiresAt: new DateInterval("1h").getEndDate(),
            scopes: [],
          };
        },
        async persist(authCode) {
          // simulate a schema without a nonce column: everything persists except nonce
          store[authCode.code] = { ...authCode, nonce: undefined };
        },
        async isRevoked() {
          return false;
        },
        async getByIdentifier(code) {
          return store[code];
        },
        async revoke() {
          return;
        },
      };

      const forgetfulGrant = new AuthCodeGrant(
        forgetfulRepository,
        inMemoryUserRepository,
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService("secret-key"),
        {
          ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS,
          requiresPKCE: false,
          useOpaqueAuthorizationCodes: true,
          oidc: oidcOptions,
        },
      );

      allowOpenidScope();
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];
      authorizationRequest.nonce = "nonce-should-survive";

      await expect(forgetfulGrant.completeAuthorizationRequest(authorizationRequest)).rejects.toThrowError(
        /must persist the nonce field on OAuthAuthCode/,
      );
    });
  });

  describe("OIDC ID token issuance", () => {
    const oidcOptions: OidcOptions = {
      authorizationEndpoint: "https://issuer.example/authorize",
      tokenEndpoint: "https://issuer.example/token",
      userinfoEndpoint: "https://issuer.example/userinfo",
      jwksUri: "https://issuer.example/jwks",
      getUserClaims: async () => ({ sub: "abc123" }),
    };

    const decodeJoseHeader = (token: string) =>
      JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));

    const issueOpenidCode = async (oidcGrant: AuthCodeGrant, nonce?: string) => {
      client.scopes = [scope1, { name: "openid" }];
      inMemoryDatabase.clients[client.id] = client;
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [{ name: "openid" }];
      authorizationRequest.nonce = nonce;
      const redirectResponse = await oidcGrant.completeAuthorizationRequest(authorizationRequest);
      return String(new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code"));
    };

    it("mints a signed id_token alongside the access token for the openid scope", async () => {
      const oidcGrant = createOidcGrant({ issuer: "https://issuer.example", requiresPKCE: false, oidc: oidcOptions });
      const code = await issueOpenidCode(oidcGrant, "nonce-1");

      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code,
          redirect_uri: "http://example.com",
          client_id: client.id,
        },
      });
      const response = await oidcGrant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      expect(response.body.id_token).toEqual(expect.any(String));
      const idClaims = decode(response.body.id_token) as Record<string, any>;
      expect(idClaims.iss).toBe("https://issuer.example");
      expect(idClaims.sub).toBe("abc123");
      expect(idClaims.aud).toBe(client.id);
      expect(idClaims.nonce).toBe("nonce-1");
      expect(idClaims.at_hash).toEqual(expect.any(String));
      expect(idClaims.exp).toBeTruthy();
      expect(idClaims.iat).toBeTruthy();

      const accessHeader = decodeJoseHeader(response.body.access_token);
      expect(accessHeader.typ).toBe("at+jwt");
      expect(accessHeader.alg).toBe("RS256");

      const idHeader = decodeJoseHeader(response.body.id_token);
      expect(idHeader.typ).toBe("JWT");
      expect(idHeader.alg).toBe("RS256");
    });

    it("omits the id_token when the openid scope is not granted", async () => {
      const oidcGrant = createOidcGrant({ issuer: "https://issuer.example", requiresPKCE: false, oidc: oidcOptions });
      client.scopes = [scope1];
      inMemoryDatabase.clients[client.id] = client;
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      authorizationRequest.scopes = [scope1];
      const redirectResponse = await oidcGrant.completeAuthorizationRequest(authorizationRequest);
      const code = String(new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code"));

      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code,
          redirect_uri: "http://example.com",
          client_id: client.id,
        },
      });
      const response = await oidcGrant.respondToAccessTokenRequest(request, new DateInterval("1h"));

      expect(response.body.id_token).toBeUndefined();
      // OIDC is enabled, so the access token is still tagged at+jwt even without openid.
      expect(decodeJoseHeader(response.body.access_token).typ).toBe("at+jwt");
    });

    it("rejects replay of a redeemed authorization code and mints no second id_token", async () => {
      const oidcGrant = createOidcGrant({ issuer: "https://issuer.example", requiresPKCE: false, oidc: oidcOptions });
      const code = await issueOpenidCode(oidcGrant, "nonce-replay");

      const buildTokenRequest = () =>
        new OAuthRequest({
          body: {
            grant_type: "authorization_code",
            code,
            redirect_uri: "http://example.com",
            client_id: client.id,
          },
        });

      const firstResponse = await oidcGrant.respondToAccessTokenRequest(buildTokenRequest(), new DateInterval("1h"));
      expect(firstResponse.body.id_token).toEqual(expect.any(String));

      await expect(oidcGrant.respondToAccessTokenRequest(buildTokenRequest(), new DateInterval("1h"))).rejects.toThrow(
        OAuthException,
      );
    });

    const redeemOpenidCode = async (oidcGrant: AuthCodeGrant, nonce?: string) => {
      const code = await issueOpenidCode(oidcGrant, nonce);
      request = new OAuthRequest({
        body: { grant_type: "authorization_code", code, redirect_uri: "http://example.com", client_id: client.id },
      });
      return oidcGrant.respondToAccessTokenRequest(request, new DateInterval("1h"));
    };

    it("adds custom claims from getIdTokenClaims to the id_token payload", async () => {
      const oidcGrant = createOidcGrant({
        issuer: "https://issuer.example",
        requiresPKCE: false,
        oidc: { ...oidcOptions, getIdTokenClaims: () => ({ roles: ["admin"], tenant: "acme" }) },
      });
      const response = await redeemOpenidCode(oidcGrant, "nonce-custom");

      const idClaims = decode(response.body.id_token) as Record<string, any>;
      expect(idClaims.roles).toEqual(["admin"]);
      expect(idClaims.tenant).toBe("acme");
      expect(idClaims.iss).toBe("https://issuer.example");
      expect(idClaims.nonce).toBe("nonce-custom");
    });

    it("passes the OIDC context to getIdTokenClaims", async () => {
      let received: any;
      const oidcGrant = createOidcGrant({
        issuer: "https://issuer.example",
        requiresPKCE: false,
        oidc: {
          ...oidcOptions,
          getIdTokenClaims: ctx => {
            received = ctx;
            return {};
          },
        },
      });
      await redeemOpenidCode(oidcGrant, "nonce-ctx");

      expect(received.subject).toBe("abc123");
      expect(received.clientId).toBe(client.id);
      expect(received.scopes).toContain("openid");
    });

    it("never lets getIdTokenClaims influence the JOSE header", async () => {
      const oidcGrant = createOidcGrant({
        issuer: "https://issuer.example",
        requiresPKCE: false,
        oidc: { ...oidcOptions, getIdTokenClaims: () => ({ alg: "HS256", typ: "fake", kid: "evil" }) },
      });
      const response = await redeemOpenidCode(oidcGrant, "nonce-hdr");

      const idHeader = decodeJoseHeader(response.body.id_token);
      expect(idHeader.alg).toBe("RS256");
      expect(idHeader.typ).toBe("JWT");
      expect(idHeader.kid).not.toBe("evil");
    });

    it("yields exactly the protocol claim set when no hook is configured", async () => {
      const oidcGrant = createOidcGrant({ issuer: "https://issuer.example", requiresPKCE: false, oidc: oidcOptions });
      const response = await redeemOpenidCode(oidcGrant, "nonce-lean");

      const idClaims = decode(response.body.id_token) as Record<string, any>;
      expect(Object.keys(idClaims).sort()).toEqual(["aud", "at_hash", "exp", "iat", "iss", "nonce", "sub"].sort());
    });

    it("surfaces a throwing getIdTokenClaims hook as invalid_grant", async () => {
      const oidcGrant = createOidcGrant({
        issuer: "https://issuer.example",
        requiresPKCE: false,
        oidc: {
          ...oidcOptions,
          getIdTokenClaims: () => {
            throw new Error("consumer mistake");
          },
        },
      });

      await expect(redeemOpenidCode(oidcGrant, "nonce-throw")).rejects.toMatchObject({
        errorType: "invalid_grant",
      });
    });
  });

  describe.each([false, true])("respond to revoke request (opaqueAuthCodes: %s)", opaqueAuthCodes => {
    let authorizationRequest: AuthorizationRequest;
    let authorizationCode: string;

    beforeEach(async () => {
      grant = createGrant({ issuer: "TestIssuer", useOpaqueAuthorizationCodes: opaqueAuthCodes });

      authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.user = user;
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.get("code"));
    });

    it("successfully revokes valid auth code", async () => {
      request = new OAuthRequest({
        body: {
          token: authorizationCode,
          client_id: client.id,
        },
      });

      await expect(inMemoryAuthCodeRepository.isRevoked("my-super-secret-auth-code")).resolves.toBe(false);

      const response = await grant.respondToRevokeRequest(request);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});

      await expect(inMemoryAuthCodeRepository.isRevoked("my-super-secret-auth-code")).resolves.toBe(true);
    });

    it("returns 200 for invalid token (silent failure per RFC 7009)", async () => {
      request = new OAuthRequest({
        body: {
          token: "invalid-token",
        },
      });

      const response = await grant.respondToRevokeRequest(request);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it("returns 200 for missing token parameter (silent failure per RFC 7009)", async () => {
      request = new OAuthRequest({
        body: {},
      });

      const response = await grant.respondToRevokeRequest(request);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it("returns 200 for malformed JWT token (silent failure per RFC 7009)", async () => {
      request = new OAuthRequest({
        body: {
          token: "not.a.jwt",
        },
      });

      const response = await grant.respondToRevokeRequest(request);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    describe("with client authentication", () => {
      beforeEach(() => {
        grant = createGrant({ authenticateRevoke: true });
      });

      it("successfully revokes when client owns the token", async () => {
        client.secret = "secret123";
        inMemoryDatabase.clients[client.id] = client;

        request = new OAuthRequest({
          headers: {
            authorization: `Basic ${Buffer.from(`${client.id}:${client.secret}`).toString("base64")}`,
          },
          body: {
            token: authorizationCode,
          },
        });

        const response = await grant.respondToRevokeRequest(request);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
      });

      it("returns 200 when client does not own the token (silent failure per RFC 7009)", async () => {
        const otherClient = {
          id: "other-client",
          name: "other client",
          secret: "other-secret",
          redirectUris: ["http://example.com"],
          allowedGrants: ["authorization_code"],
          scopes: [],
        };
        inMemoryDatabase.clients[otherClient.id] = otherClient;

        request = new OAuthRequest({
          headers: {
            authorization: `Basic ${Buffer.from(`${otherClient.id}:${otherClient.secret}`).toString("base64")}`,
          },
          body: {
            token: authorizationCode,
          },
        });

        const response = await grant.respondToRevokeRequest(request);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
      });

      it("returns 200 when authentication required but not provided (silent failure)", async () => {
        request = new OAuthRequest({
          body: {
            token: authorizationCode,
          },
        });

        const response = await grant.respondToRevokeRequest(request);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({});
      });
    });
  });
});
