import querystring from "querystring";
import { decode } from "jsonwebtoken";

import { AuthCodeGrant, IAuthCodePayload, REGEXP_CODE_CHALLENGE } from "../../../src/grants";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryRefreshTokenRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "../../../examples/in_memory/repository";
import { JWT } from "../../../examples/in_memory/oauth_authorization_server";
import { OAuthRequest } from "../../../src/requests/request";
import { OAuthResponse } from "../../../src/responses";
import { OAuthClient } from "../../../src/entities";
import { inMemoryDatabase } from "../../../examples/in_memory/database";
import { AuthorizationRequest } from "../../../src/requests";

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
      isConfidential: false,
      name: "test auth code client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["authorization_code"],
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

    inMemoryDatabase.clients.push(client);
  });

  describe("can respond to authorization request", () => {
    it("succeeds with pkce s256", async () => {
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
      expect(authorizationRequest.redirectUri).toBe("http://localhost")
      expect(authorizationRequest.state).toBe("state-is-a-secret")
      expect(authorizationRequest.codeChallenge).toBe(codeChallenge)
      expect(authorizationRequest.codeChallengeMethod).toBe("S256")
      expect(authorizationRequest.scopes).toStrictEqual([])
    });
  });

  describe("validate authorization request", () => {
    it("oh yeah", async () => {
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
    })
  });

  // describe("complete authorization request", () => {});

  // describe("retrieve access token from code", () => {});
});
