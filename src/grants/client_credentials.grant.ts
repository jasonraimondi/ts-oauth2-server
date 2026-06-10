import { RequestInterface } from "../requests/request.js";
import { OAuthResponse, ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant, ParsedAccessToken, ParsedRefreshToken } from "./abstract/abstract.grant.js";
import { ErrorType, OAuthException } from "../exceptions/oauth.exception.js";
import { OAuthToken } from "../entities/token.entity.js";
import { isClientConfidential, OAuthClient } from "../entities/client.entity.js";
import type { OAuthTokenIntrospectionResponse } from "../authorization_server.js";

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
    let client: OAuthClient | undefined;
    if (this.options.authenticateIntrospect) {
      try {
        client = await this.validateClientIdentity(req);
      } catch (err) {
        this.options.logger?.log(err);
        if (err instanceof OAuthException && err.errorType !== ErrorType.InvalidRequest) throw err;
        throw OAuthException.invalidClient();
      }
    }

    if (client && this.options.introspectionRequiresConfidentialClient && !isClientConfidential(client)) {
      throw OAuthException.invalidClient("Introspection requires a confidential client.");
    }

    const { parsedToken, oauthToken, expiresAt, tokenType } = await this.tokenFromRequest(req);

    let active = expiresAt > new Date();

    // A live row with a future expiry may still be flag-revoked; consult the same
    // repository seams the refresh grant and UserInfo honor (RFC 7662 §2.2).
    if (active && oauthToken) {
      if (tokenType === "refresh_token") {
        active = !(await this.tokenRepository.isRefreshTokenRevoked(oauthToken));
      } else if (typeof this.tokenRepository.isAccessTokenRevoked === "function") {
        active = !(await this.tokenRepository.isAccessTokenRevoked(oauthToken));
      }
    }

    let body: OAuthTokenIntrospectionResponse = { active: false };

    if (active && oauthToken) {
      // Persisted fields win over echoed claims: introspection reports the
      // server's current state, not the token's (see docs/adr/0008).
      body = {
        ...(typeof parsedToken === "object" ? parsedToken : {}),
        active: true,
        scope: oauthToken.scopes.map(s => s.name).join(this.options.scopeDelimiter),
        client_id: oauthToken.client.id,
        token_type: tokenType,
      };
    }

    return new OAuthResponse({ body });
  }

  canRespondToRevokeRequest(request: RequestInterface): boolean {
    return this.getRequestParameter("token_type_hint", request) !== "auth_code";
  }

  async respondToRevokeRequest(req: RequestInterface): Promise<ResponseInterface> {
    // Silently ignore - per RFC 7009, invalid tokens should not cause error responses
    // @see https://datatracker.ietf.org/doc/html/rfc7009#section-2.2
    const errorResponse = new OAuthResponse();

    let authenticatedClient;
    if (this.options.authenticateRevoke) {
      try {
        authenticatedClient = await this.validateClientIdentity(req);
      } catch (err) {
        this.options.logger?.log(err);
        if (err instanceof OAuthException && err.errorType !== ErrorType.InvalidRequest) throw err;
        throw OAuthException.invalidClient();
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

    // Claims are trusted only after the signature verifies — a decoded-but-
    // unverified payload can spoof scope/sub/ownership (see docs/adr/0008).
    // Expiry and nbf are ignored at parse time: `active` derives from the
    // persisted entity, and an expired token must still be revocable (RFC 7009).
    let parsedToken: unknown = undefined;
    try {
      parsedToken = await this.jwt.verify(token, { ignoreExpiration: true, ignoreNotBefore: true });
    } catch {
      parsedToken = undefined;
    }

    let oauthToken: undefined | OAuthToken = undefined;
    let expiresAt = new Date(0);
    let tokenType: "access_token" | "refresh_token" = "access_token";

    // token_type_hint is advisory (RFC 7009 §2.1): the verified payload shape
    // identifies the token type, so refresh tokens resolve without a hint.
    if (this.isAccessTokenPayload(parsedToken)) {
      if (typeof this.tokenRepository.getByAccessToken !== "function") {
        throw OAuthException.internalServerError("TokenRepository#getByAccessToken is not implemented");
      }

      // if token not found, ignore and return undefined oauthToken
      oauthToken = await this.tokenRepository.getByAccessToken(parsedToken.jti).catch(() => undefined);
      expiresAt = oauthToken?.accessTokenExpiresAt ?? expiresAt;
    } else if (this.isRefreshTokenPayload(parsedToken)) {
      // if token not found, ignore and return undefined oauthToken
      oauthToken = await this.tokenRepository.getByRefreshToken(parsedToken.refresh_token_id).catch(() => undefined);
      expiresAt = oauthToken?.refreshTokenExpiresAt ?? expiresAt;
      tokenType = "refresh_token";
    } else if (parsedToken === undefined && this.options.useOpaqueRefreshTokens) {
      // Opaque refresh tokens are raw strings, not JWTs; the encoder rebuilds
      // the payload from storage so the revoke ownership check keeps client_id.
      const resolution = await this.refreshTokenEncoder.resolve(token).catch(() => undefined);
      if (resolution?.token) {
        parsedToken = resolution.payload;
        oauthToken = resolution.token;
        expiresAt = oauthToken.refreshTokenExpiresAt ?? expiresAt;
        tokenType = "refresh_token";
      }
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
