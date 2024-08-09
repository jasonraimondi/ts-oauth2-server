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
    const { parsedToken, oauthToken, expiresAt, tokenType } = await this.tokenFromRequest(req);

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

  canRespondToRevokeRequest(request: RequestInterface): boolean {
    return this.getRequestParameter("token_type_hint", request) !== "auth_code";
  }

  async respondToRevokeRequest(req: RequestInterface): Promise<ResponseInterface> {
    let { oauthToken } = await this.tokenFromRequest(req);

    await this.tokenRepository.revoke(oauthToken);

    return new OAuthResponse();
  }

  private async tokenFromRequest(req: RequestInterface) {
    req.body["grant_type"] = this.identifier;

    await this.validateClient(req);

    const token = this.getRequestParameter("token", req);
    const tokenTypeHint = this.getRequestParameter("token_type_hint", req);

    if (!token) {
      throw OAuthException.invalidParameter("token", "Missing `token` parameter in request body");
    }

    const parsedToken: unknown = this.jwt.decode(token);

    let oauthToken: undefined | OAuthToken = undefined;
    let expiresAt = new Date(0);
    let tokenType: "access_token" | "refresh_token" = "access_token";

    if (tokenTypeHint === "refresh_token" && this.isRefreshTokenPayload(parsedToken)) {
      oauthToken = await this.tokenRepository.getByRefreshToken(parsedToken.refresh_token_id);
      expiresAt = oauthToken.refreshTokenExpiresAt ?? expiresAt;
      tokenType = "refresh_token";
    } else if (this.isAccessTokenPayload(parsedToken)) {
      if (typeof this.tokenRepository.getByAccessToken !== "function") {
        throw OAuthException.internalServerError("TokenRepository#getByAccessToken is not implemented");
      }
      oauthToken = await this.tokenRepository.getByAccessToken(parsedToken.jti!);
      if (!oauthToken) {
        throw OAuthException.badRequest("Token not found");
      }
      expiresAt = oauthToken.accessTokenExpiresAt ?? expiresAt;
    } else {
      throw OAuthException.invalidParameter("token", "Invalid token provided");
    }
    return { parsedToken, oauthToken, expiresAt, tokenType };
  }

  private isAccessTokenPayload(token: unknown): token is ParsedAccessToken {
    return typeof token === "object" && token !== null && "jti" in token;
  }

  private isRefreshTokenPayload(token: unknown): token is ParsedRefreshToken {
    return typeof token === "object" && token !== null && "refresh_token_id" in token;
  }
}
