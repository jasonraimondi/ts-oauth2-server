import { beforeEach, describe, expect, it } from "vitest";

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
  OAuthClient,
  OAuthException,
  OAuthRequest,
  OAuthScope,
  OAuthUser,
  REGEX_ACCESS_TOKEN,
} from "../../../src/index.js";
import { expectTokenResponse } from "./client_credentials.grant.spec.js";
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
describe("authorization_code grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;
  let scope1: OAuthScope;
  let grant: AuthCodeGrant;

  let request: OAuthRequest;

  const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
  const codeChallenge = "hA3IxucyJC0BsZH9zdYvGeK0ck2dC-seLBn20l18Iws"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest());

  beforeEach(() => {
    request = new OAuthRequest();

    user = { id: "abc123", email: "jason@example.com" };
    scope1 = { name: "scope-1" };

    client = {
      id: "authcodeclient",
      name: "test auth code client",
      secret: undefined,
      redirectUris: ["http://example.com"],
      allowedGrants: ["authorization_code"],
      scopes: [],
    };

    grant = createGrant({ issuer: "TestIssuer" });

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.id] = user;
    inMemoryDatabase.scopes[scope1.name] = scope1;
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

    it.skip("throws for invalid code_challenge pkce format regex", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com",
          state: "state-is-a-secret",
          code_challenge: "invalid-format(with!Invalid~characters",
          code_challenge_method: "S256",
        },
      });
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(
        /Code challenge must follow the specifications of RFC-7636 and match/,
      );
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

    // it("uses clients redirect url if request ", async () => {});

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
  });

  describe("respond to access token request with code", () => {
    let authorizationRequest: AuthorizationRequest;
    let authorizationCode: string;

    beforeEach(async () => {
      authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.user = user;
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = new URLSearchParams(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.get("code"));
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
      grant = createGrant({ requiresPKCE: false, issuer: "TestIssuer" });
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
  });
});
