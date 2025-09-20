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

    const finalizedScopes = await this.scopeRepository.finalize(
      await this.validateScopes(bodyScopes),
      this.identifier,
      client,
    );

    const user = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, finalizedScopes);

    const jwtExtras = await this.extraJwtFields(req, client, user);

    return await this.makeBearerTokenResponse(client, accessToken, finalizedScopes, jwtExtras);
  }

  canRespondToIntrospectRequest(_request: RequestInterface): boolean {
    return true;
  }

  async respondToIntrospectRequest(req: RequestInterface): Promise<ResponseInterface> {
    req.body["grant_type"] = this.identifier;

    if (this.options.authenticateIntrospect) await this.validateClient(req);

    const { parsedToken, oauthToken, expiresAt, tokenType } = await this.tokenFromRequest(req);

    const active = expiresAt > new Date();

    let body: OAuthTokenIntrospectionResponse = { active: false };

    if (active && oauthToken) {
      body = {
        active: true,
        scope: oauthToken.scopes.map(s => s.name).join(this.options.scopeDelimiter),
        client_id: oauthToken.client.id,
        token_type: tokenType,
        ...(typeof parsedToken === "object" ? parsedToken : {}),
      };
    }

    return new OAuthResponse({ body });
  }

  canRespondToRevokeRequest(request: RequestInterface): boolean {
    return this.getRequestParameter("token_type_hint", request) !== "auth_code";
  }

  async respondToRevokeRequest(req: RequestInterface): Promise<ResponseInterface> {
    req.body["grant_type"] = this.identifier;

    // Silently ignore - per RFC 7009, invalid tokens should not cause error responses
    // @see https://datatracker.ietf.org/doc/html/rfc7009#section-2.2
    const errorResponse = new OAuthResponse();

    let authenticatedClient;
    if (this.options.authenticateRevoke) {
      try {
        authenticatedClient = await this.validateClient(req);
      } catch (err) {
        this.options.logger?.log(err);
        return errorResponse;
      }
    }

    let parsedToken;
    let oauthToken;
    try {
      const tokenData = await this.tokenFromRequest(req);
      parsedToken = tokenData.parsedToken;
      oauthToken = tokenData.oauthToken;
    } catch (err) {
      this.options.logger?.log(err);
      return errorResponse;
    }

    if (this.options.authenticateRevoke && authenticatedClient && parsedToken) {
      const tokenClientId = this.options.tokenCID === "id" ? authenticatedClient.id : authenticatedClient.name;

      if (this.isAccessTokenPayload(parsedToken) && parsedToken.cid !== tokenClientId) {
        this.options.logger?.log("Token client ID does not match authenticated client");
        return errorResponse;
      }

      if (this.isRefreshTokenPayload(parsedToken) && parsedToken.client_id !== authenticatedClient.id) {
        this.options.logger?.log("Token client ID does not match authenticated client");
        return errorResponse;
      }
    }

    try {
      if (oauthToken) await this.tokenRepository.revoke(oauthToken);
    } catch (err) {
      this.options.logger?.log(err);
      // Silently ignore - per RFC 7009, invalid tokens should not cause error responses
    }

    return errorResponse;
  }

  private readonly revokeTokenTypeHintRegExp = /^(access_token|refresh_token|auth_code)$/;

  private async tokenFromRequest(req: RequestInterface) {
    const token = this.getRequestParameter("token", req);

    if (!token) {
      throw OAuthException.invalidParameter("token", "Missing `token` parameter in request body");
    }

    const tokenTypeHint = this.getRequestParameter("token_type_hint", req);

    if (typeof tokenTypeHint === "string" && !this.revokeTokenTypeHintRegExp.test(tokenTypeHint)) {
      throw OAuthException.unsupportedTokenType();
    }

    const parsedToken: unknown = this.jwt.decode(token);

    let oauthToken: undefined | OAuthToken = undefined;
    let expiresAt = new Date(0);
    let tokenType: "access_token" | "refresh_token" = "access_token";

    if (tokenTypeHint === "refresh_token" && this.isRefreshTokenPayload(parsedToken)) {
      oauthToken = await this.tokenRepository.getByRefreshToken(parsedToken.refresh_token_id).catch();
      expiresAt = oauthToken?.refreshTokenExpiresAt ?? expiresAt;
      tokenType = "refresh_token";
    } else if (this.isAccessTokenPayload(parsedToken)) {
      if (typeof this.tokenRepository.getByAccessToken !== "function") {
        throw OAuthException.internalServerError("TokenRepository#getByAccessToken is not implemented");
      }

      // if token not found, ignore and return undefined oauthToken
      oauthToken = await this.tokenRepository.getByAccessToken(parsedToken.jti).catch();
      expiresAt = oauthToken?.accessTokenExpiresAt ?? expiresAt;
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
