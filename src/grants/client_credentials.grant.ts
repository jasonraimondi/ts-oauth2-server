import { RequestInterface } from "../requests/request.js";
import { OAuthResponse, ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant, ParsedAccessToken, ParsedRefreshToken } from "./abstract/abstract.grant.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { OAuthToken } from "../entities/token.entity.js";
import { OAuthTokenIntrospectionResponse } from "../authorization_server.js";

export class ClientCredentialsGrant extends AbstractGrant {
  readonly identifier = "client_credentials";

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const bodyScopes = this.getRequestParameter("scope", req, []);

    const validScopes = await this.validateScopes(bodyScopes);

    const user = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, validScopes);

    const jwtExtras = await this.extraJwtFields(req, client, user);

    return await this.makeBearerTokenResponse(client, accessToken, validScopes, jwtExtras);
  }

  canRespondToIntrospectRequest(_request: RequestInterface): boolean {
    return true;
  }

  async respondToIntrospectRequest(req: RequestInterface): Promise<ResponseInterface> {
    // introspection is authenticated via client_credentials, but we don't want to require this param in the request
    req.body["grant_type"] = "client_credentials";
    await this.validateClient(req);

    const token = req.body?.["token"];
    const tokenTypeHint = req.body?.["token_type_hint"];

    if (!token) {
      throw OAuthException.invalidParameter("token", "Missing `token` parameter in request body");
    }

    const parsedToken: unknown = this.jwt.decode(token);

    let oauthToken: undefined | OAuthToken = undefined;
    let expiresAt = new Date(0);
    let tokenType: string = "access_token";

    if (tokenTypeHint === "refresh_token" && this.isRefreshTokenPayload(parsedToken)) {
      oauthToken = await this.tokenRepository.getByRefreshToken(parsedToken.refresh_token_id);
      expiresAt = oauthToken.refreshTokenExpiresAt ?? expiresAt;
      tokenType = "refresh_token";
    } else if (this.isAccessTokenPayload(parsedToken)) {
      if (typeof this.tokenRepository.getByAccessToken !== "function") {
        throw OAuthException.internalServerError("Token introspection for access tokens is not supported");
      }
      oauthToken = await this.tokenRepository.getByAccessToken(parsedToken.jti!);
      if (!oauthToken) {
        throw OAuthException.badRequest("Token not found");
      }
      expiresAt = oauthToken.accessTokenExpiresAt ?? expiresAt;
    } else {
      throw OAuthException.invalidParameter("token", "Invalid token provided");
    }

    const active = expiresAt > new Date();

    const responseBody: OAuthTokenIntrospectionResponse = active
      ? {
          active: true,
          scope: oauthToken.scopes.map(s => s.name).join(this.options.scopeDelimiter),
          client_id: oauthToken.client.id,
          token_type: tokenType,
          ...parsedToken,
        }
      : { active: false };

    const response = new OAuthResponse();
    response.body = responseBody;
    return response;
  }

  private isAccessTokenPayload(token: unknown): token is ParsedAccessToken {
    return typeof token === "object" && token !== null && "jti" in token;
  }

  private isRefreshTokenPayload(token: unknown): token is ParsedRefreshToken {
    return typeof token === "object" && token !== null && "refresh_token_id" in token;
  }
}
