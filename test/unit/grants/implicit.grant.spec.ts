import { decode } from "jsonwebtoken";
import querystring from "querystring";
import { DateInterval } from "~/authorization_server";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthUser } from "~/entities/user.entity";
import { IAuthCodePayload, REGEXP_CODE_CHALLENGE } from "~/grants/auth_code.grant";
import { ImplicitGrant } from "~/grants/implicit.grant";
import { AuthorizationRequest } from "~/requests/authorization.request";
import { OAuthRequest } from "~/requests/request";
import { OAuthResponse } from "~/responses/response";
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

describe("implicit grant", () => {
  let user: OAuthUser;
  let client: OAuthClient;

  let grant: ImplicitGrant;

  let request: OAuthRequest;
  let response: OAuthResponse;

  beforeEach(() => {
    request = new OAuthRequest();
    response = new OAuthResponse();

    user = {
      identifier: "512ab9a4-c786-48a6-8ad6-94c53a8dc651",
      password: "password123",
    };
    client = {
      id: "35615f2f-13fa-4731-83a1-9e34556ab390",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["implicit"],
      scopes: [],
    };

    grant = new ImplicitGrant(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryRefreshTokenRepository,
      inMemoryAuthCodeRepository,
      inMemoryScopeRepository,
      inMemoryUserRepository,
      new JWT("secret-key"),
    );

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.identifier] = user;
  });

  describe("validate authorization request", () => {
    it("is successful with s256 pkce", async () => {
      request = new OAuthRequest({
        query: {
          response_type: "token",
          client_id: client.id,
          redirect_uri: "http://localhost",
          state: "state-is-a-secret",
          scopes: undefined,
        },
      });
      const authorizationRequest = await grant.validateAuthorizationRequest(request);

      expect(authorizationRequest.isAuthorizationApproved).toBe(false);
      expect(authorizationRequest.client.id).toBe(client.id);
      expect(authorizationRequest.client.name).toBe(client.name);
      expect(authorizationRequest.redirectUri).toBe("http://localhost");
      expect(authorizationRequest.state).toBe("state-is-a-secret");
      expect(authorizationRequest.codeChallenge).toBeUndefined();
      expect(authorizationRequest.codeChallengeMethod).toBeUndefined();
      expect(authorizationRequest.scopes).toStrictEqual([]);
    });
  });

  describe("complete authorization request", () => {
    it("is successful", async () => {
      const authorizationRequest = new AuthorizationRequest("implicit", client);

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
});
