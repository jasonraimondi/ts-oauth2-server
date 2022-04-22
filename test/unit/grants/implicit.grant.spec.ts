import { decode } from "jsonwebtoken";
import querystring from "querystring";

import { inMemoryDatabase } from "../../../examples/in_memory/database";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import {
  AuthorizationRequest,
  DateInterval,
  ImplicitGrant,
  ITokenData,
  JwtService,
  OAuthClient,
  OAuthRequest,
  OAuthScope,
  OAuthUser,
  REGEX_ACCESS_TOKEN,
  roundToSeconds,
} from "../../../src";

describe("implicit grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;
  let scope1: OAuthScope;
  let scope2: OAuthScope;

  let grant: ImplicitGrant;

  let request: OAuthRequest;

  beforeEach(() => {
    request = new OAuthRequest();

    user = {
      id: "512ab9a4-c786-48a6-8ad6-94c53a8dc651",
      password: "password123",
    };
    client = {
      id: "35615f2f-13fa-4731-83a1-9e34556ab390",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://example.com"],
      allowedGrants: ["implicit"],
      scopes: [],
    };
    scope1 = { name: "scope-1" };
    scope2 = { name: "scope-2" };

    grant = new ImplicitGrant(
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
    inMemoryDatabase.scopes[scope2.name] = scope2;
  });

  describe("validate authorization request", () => {
    it("is successful with minimal request", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "token",
          client_id: client.id,
          redirect_uri: "http://example.com",
        },
      });

      // act
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      // assert
      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://example.com");
      expect(authorizationRequest.state).toBeUndefined();
      expect(authorizationRequest.codeChallenge).toBeUndefined();
      expect(authorizationRequest.codeChallengeMethod).toBeUndefined();
      expect(authorizationRequest.scopes).toStrictEqual([]);
    });

    it("is successful with state and scopes", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "token",
          client_id: client.id,
          redirect_uri: "http://example.com",
          state: "f2ae4dc5-b535-4949-aaed-54ebbf08e876",
          scope: "scope-1 scope-2",
        },
      });

      // act
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      // assert
      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://example.com");
      expect(authorizationRequest.state).toBe("f2ae4dc5-b535-4949-aaed-54ebbf08e876");
      expect(authorizationRequest.codeChallenge).toBeUndefined();
      expect(authorizationRequest.codeChallengeMethod).toBeUndefined();
      expect(authorizationRequest.scopes).toStrictEqual([scope1, scope2]);
    });

    it("throws if missing client_id", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "token",
        },
      });

      // act
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      // assert
      await expect(authorizationRequest).rejects.toThrowError(/Check the `client_id` parameter/);
    });

    it("throws if missing redirect_uri", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "token",
          client_id: client.id,
        },
      });

      // act
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      // assert
      expect(authorizationRequest.redirectUri).toBe("http://example.com");
    });

    it("throws when passed invalid scopes", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "token",
          client_id: client.id,
          redirect_uri: "http://example.com",
          scope: "scope-1 non-existant non-existant-2",
        },
      });

      // act
      const authorizationRequest = grant.validateAuthorizationRequest(request);

      // assert
      await expect(authorizationRequest).rejects.toThrowError(/Check the `non-existant, non-existant-2` scope\(s\)/);
    });
  });

  describe("complete authorization request", () => {
    it("is successful", async () => {
      // arrange
      const now = roundToSeconds(Date.now());
      const authorizationRequest = new AuthorizationRequest("implicit", client, "http://example.com");
      authorizationRequest.user = user;
      authorizationRequest.isAuthorizationApproved = true;
      authorizationRequest.state = "abc123-state";

      // act
      const response = await grant.completeAuthorizationRequest(authorizationRequest);
      const authorizeResponseQuery = querystring.parse(response.headers.location.split("?")[1]);
      const decodedCode = <ITokenData>decode(String(authorizeResponseQuery.access_token));

      // assert
      expect(authorizeResponseQuery.state).toBe("abc123-state");
      expect(decodedCode.sub).toBe(user.id);
      expect(decodedCode.jti).toMatch(REGEX_ACCESS_TOKEN);
      expect(decodedCode.exp).toBeGreaterThan(now);
      expect(decodedCode.iat).toBe(now);
    });

    it("will not complete if isAuthorizationApproved=false", async () => {
      // arrange
      const authorizationRequest = new AuthorizationRequest("implicit", client, "http://example.com");
      authorizationRequest.user = user;
      authorizationRequest.isAuthorizationApproved = false;

      // act
      const response = grant.completeAuthorizationRequest(authorizationRequest);

      //assert
      await expect(response).rejects.toThrowError(/The resource owner or authorization server denied the request/);
    });

    // it("uses clients redirect url if request ", async () => {});
  });

  describe("canRespondToAccessTokenRequest", () => {
    it("valid request can respond", async () => {
      // arrange
      request = new OAuthRequest({
        query: {
          response_type: "token",
          client_id: client.id,
        },
      });

      // act
      const canRespond = grant.canRespondToAuthorizationRequest(request);

      // assert
      expect(canRespond).toBeTruthy();
    });

    it("invalid request cannot respond", async () => {
      // act
      const canRespond = grant.canRespondToAccessTokenRequest(request);

      // assert
      expect(canRespond).toBeFalsy();
    });
  });

  describe("respondToAccessTokenRequest", () => {
    it("throws because implicit grant cannot respond to access token requests", async () => {
      // assert
      expect(() => grant.respondToAccessTokenRequest(request, new DateInterval("1h"))).toThrowError(
        /The implicit grant can't respond to access token requests/,
      );
    });
  });
});
