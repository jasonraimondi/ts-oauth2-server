import querystring from "querystring";
import { decode } from "jsonwebtoken";

import { inMemoryDatabase } from "../../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import { OAuthScope } from "../../../src/entities/scope.entity";
import { OAuthUser } from "../../../src/entities/user.entity";
import { OAuthClient } from "../../../src/entities/client.entity";
import {
  AuthCodeGrant,
  IAuthCodePayload,
  REGEX_ACCESS_TOKEN,
  REGEXP_CODE_CHALLENGE,
} from "../../../src/grants/auth_code.grant";
import { AuthorizationRequest } from "../../../src/requests/authorization.request";
import { OAuthRequest } from "../../../src/requests/request";
import { OAuthResponse } from "../../../src/responses/response";
import { base64urlencode } from "../../../src/utils/base64";
import { DateInterval } from "../../../src/utils/date_interval";
import { JwtService } from "../../../src/utils/jwt";
import { expectTokenResponse } from "./client_credentials.grant.spec";

describe("authorization_code grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;
  let scope1: OAuthScope;
  let grant: AuthCodeGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
  const codeChallenge = "ODQwZGM4YzZlNzMyMjQyZDAxYjE5MWZkY2RkNjJmMTllMmI0NzI0ZDlkMGJlYjFlMmMxOWY2ZDI1ZDdjMjMwYg"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

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

    grant = new AuthCodeGrant(
      inMemoryAuthCodeRepository,
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JwtService("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.id] = user;
    inMemoryDatabase.scopes[scope1.name] = scope1;
  });

  describe("can respond to authorization request", () => {
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

    it("returns false for missing client_id", async () => {
      request = new OAuthRequest({
        query: {
          ...validQueryData,
          client_id: undefined,
        },
      });

      expect(grant.canRespondToAuthorizationRequest(request)).toBe(false);
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
    it("is successful with s256 pkce", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          // single object arrays is valid
          redirect_uri: ["http://example.com"],
          state: "state-is-a-secret",
          code_challenge: codeChallenge,
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
      expect(authorizationRequest.scopes).toStrictEqual([]);
    });

    it("is successful with plain pkce", async () => {
      client.redirectUris = ["http://example.com?this_should_work=true"];
      inMemoryDatabase.clients[client.id] = client;
      const plainCodeChallenge = "qqVDyvlSezXc64NY5Rx3BbLaT7c2xEBgoJP9domepFZLEjo9ln8EAaSdfewSNY5Rx3BbL";
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://example.com?this_should_work=true",
          scope: "scope-1",
          state: "state-is-a-secret",
          code_challenge: base64urlencode(plainCodeChallenge), // code verifier plain
          code_challenge_method: "plain",
        },
      });
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://example.com?this_should_work=true");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.codeChallenge).toBe(base64urlencode(plainCodeChallenge));
      expect(authorizationRequest.codeChallengeMethod).toBe("plain");
      expect(authorizationRequest.scopes).toStrictEqual([{ name: "scope-1" }]);
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
      grant.options.requiresPKCE = false;

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
      const plainCodeChallenge = "qqVDyvlSezXc64NY5Rx3BbLaT7c2xEBgoJP9domepFZLEjo9ln8EAaSdfewSNY5Rx3BbL";
      request = new OAuthRequest({
        query: {
          redirect_uri: undefined,
          response_type: "code",
          client_id: client.id,
          code_challenge: base64urlencode(plainCodeChallenge), // code verifier plain
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

    it("throws for invalid code_challenge pkce format regex", async () => {
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
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));

      expect(response.headers.location.includes("http://example.com?code=")).toBeTruthy();
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://example.com");
      expect(decodedCode.code_challenge).toMatch(REGEXP_CODE_CHALLENGE);
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
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));

      expect(response.headers.location).toMatch(/http\:\/\/example\.com\?this_should_work=true\&code\=/);
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://example.com?this_should_work=true");
      expect(decodedCode.code_challenge).toMatch(REGEXP_CODE_CHALLENGE);
    });

    // it("uses clients redirect url if request ", async () => {});

    it("is successful without pkce flow", async () => {
      grant.options.requiresPKCE = false;
      const authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.state = "abc123";
      authorizationRequest.user = user;
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));

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
      const authorizeResponseQuery = querystring.parse(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.code);
    });

    it("is successful with pkce s256", async () => {
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
      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, response, new DateInterval("1h"));

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
      const authorizeResponseQuery = querystring.parse(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.code);

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
      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, response, new DateInterval("1h"));

      // assert
      expectTokenResponse(accessTokenResponse);
      expect(accessTokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
    });

    it("is successful without pkce", async () => {
      grant.options.requiresPKCE = false;
      authorizationRequest = new AuthorizationRequest("authorization_code", client, "http://example.com");
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.user = user;
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(redirectResponse.headers.location.split("?")[1]);
      authorizationCode = String(authorizeResponseQuery.code);

      // act
      request = new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: authorizationRequest.redirectUri,
          client_id: client.id,
        },
      });
      const accessTokenResponse = await grant.respondToAccessTokenRequest(request, response, new DateInterval("1h"));

      // assert
      expectTokenResponse(accessTokenResponse);
      const decodedToken: any = decode(accessTokenResponse.body.access_token);
      expect(decodedToken?.email).toBe("jason@example.com");
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
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, response, new DateInterval("1h"));

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
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, response, new DateInterval("1h"));

      // assert
      await expect(accessTokenResponse).rejects.toThrowError(
        /Code verifier must follow the specifications of RFS-7636/,
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
      const accessTokenResponse = grant.respondToAccessTokenRequest(request, response, new DateInterval("1h"));

      // assert
      await expect(accessTokenResponse).rejects.toThrowError(/Failed to verify code challenge/);
    });
  });
});
