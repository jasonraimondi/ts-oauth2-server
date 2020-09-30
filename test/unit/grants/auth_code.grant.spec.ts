import querystring from "querystring";
import { decode } from "jsonwebtoken";
import { DateInterval } from "~/authorization_server";

import { OAuthClient } from "~/entities/client.entity";
import { AuthCodeGrant, IAuthCodePayload, REGEXP_CODE_CHALLENGE } from "~/grants/auth_code.grant";
import { AuthorizationRequest } from "~/requests/authorization.request";
import { OAuthRequest } from "~/requests/request";
import { OAuthResponse } from "~/responses/response";
import { base64urlencode } from "~/utils/base64";
import { JWT } from "~/utils/jwt";
import { inMemoryDatabase } from "../../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryRefreshTokenRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import { expectTokenResponse } from "./client_credentials.grant.spec";

describe("authorization_code grant", () => {
  let client: OAuthClient;
  let grant: AuthCodeGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
  const codeChallenge = "ODQwZGM4YzZlNzMyMjQyZDAxYjE5MWZkY2RkNjJmMTllMmI0NzI0ZDlkMGJlYjFlMmMxOWY2ZDI1ZDdjMjMwYg"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

    client = {
      id: "authcodeclient",
      name: "test auth code client",
      secret: undefined,
      redirectUris: ["http://localhost"],
      allowedGrants: ["authorization_code"],
      scopes: [],
    };

    grant = new AuthCodeGrant(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryRefreshTokenRepository,
      inMemoryAuthCodeRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JWT("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
  });

  describe("can respond to authorization request", () => {
    let validQueryData: any;

    beforeEach(() => {
      validQueryData = {
        response_type: "code",
        client_id: client.id,
        redirect_uri: "http://localhost",
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
          redirect_uri: "http://localhost",
          state: "state-is-a-secret",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        },
      });
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://localhost");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.codeChallenge).toBe(codeChallenge);
      expect(authorizationRequest.codeChallengeMethod).toBe("S256");
      expect(authorizationRequest.scopes).toStrictEqual([]);
    });

    it("is successful with plain pkce", async () => {
      inMemoryDatabase.scopes["scope-1"] = { name: "scope-1" };
      const plainCodeChallenge = "qqVDyvlSezXc64NY5Rx3BbLaT7c2xEBgoJP9domepFZLEjo9ln8EAaSdfewSNY5Rx3BbL";
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://localhost",
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
      expect(authorizationRequest.redirectUri).toBe("http://localhost");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.codeChallenge).toBe(base64urlencode(plainCodeChallenge));
      expect(authorizationRequest.codeChallengeMethod).toBe("plain");
      expect(authorizationRequest.scopes).toStrictEqual([{ name: "scope-1" }]);
    });

    it("throws when missing code_challenge pkce", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://localhost",
          state: "state-is-a-secret",
          code_challenge_method: "plain",
        },
      });
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      await expect(authorizationRequest).rejects.toThrowError(
        /The authorization server requires public clients to use PKCE RFC-7636/,
      );
    });

    it("throws for invalid code_challenge pkce format", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: "http://localhost",
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
  });

  describe("complete authorization request", () => {
    it("is successful", async () => {
      const authorizationRequest = new AuthorizationRequest("authorization_code", client);
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.redirectUri = "http://localhost";

      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(response.headers.location);
      const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));

      // console.log(decodedCode);
      expect(decodedCode.client_id).toBe(client.id);
      expect(decodedCode.redirect_uri).toBe("http://localhost");
      expect(decodedCode.code_challenge).toMatch(REGEXP_CODE_CHALLENGE);
    });

    // it("uses clients redirect url if request ", async () => {});
  });

  describe("respond to access token request with code", () => {
    let authorizationRequest: AuthorizationRequest;
    let authorizationCode: string;

    beforeEach(async () => {
      authorizationRequest = new AuthorizationRequest("authorization_code", client);
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "S256";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.redirectUri = "http://localhost";
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(redirectResponse.headers.location);
      authorizationCode = String(authorizeResponseQuery.code);
    });

    it("is successful with s256 pkce", async () => {
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
    });

    it("is successful with s256 plain", async () => {
      authorizationRequest = new AuthorizationRequest("authorization_code", client);
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.codeChallengeMethod = "plain";
      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.redirectUri = "http://localhost";
      const redirectResponse = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(redirectResponse.headers.location);
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
