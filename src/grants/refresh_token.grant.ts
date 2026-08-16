import { OAuthToken } from "../entities/token.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { RequestInterface } from "../requests/request.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant } from "./abstract/abstract.grant.js";

/**
 * The `refresh_token` grant (RFC 6749 §6). The client presents a refresh token
 * at `/token` and receives a new access token and refresh token. The old token
 * is revoked first.
 *
 * The new token may narrow the scopes, never widen them: a requested scope the
 * old token did not carry is rejected as `invalid_scope`. The grant is
 * OIDC-unaware — it never returns an ID token. The {@link AuthorizationServer}
 * constructor enables it.
 *
 * @see https://tsoauth2server.com/docs/grants/refresh_token
 */
export class RefreshTokenGrant extends AbstractGrant {
  readonly identifier = "refresh_token";

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const oldToken = await this.validateOldRefreshToken(req, client.id);

    const user = oldToken.user;

    const scopes = await this.scopeRepository.finalize(
      await this.validateScopes(
        this.getRequestParameter(
          "scope",
          req,
          oldToken.scopes.map(s => s.name),
        ),
      ),
      this.identifier,
      client,
      user?.id,
    );

    scopes.forEach(scope => {
      if (!oldToken.scopes.map(scope => scope.name).includes(scope.name)) {
        throw OAuthException.invalidScope(scope.name);
      }
    });

    await this.tokenRepository.revoke(oldToken);

    let newToken = await this.issueAccessToken(accessTokenTTL, client, user, scopes, oldToken.originatingAuthCodeId);

    newToken = await this.issueRefreshToken(newToken, client);

    const extraJwtFields = await this.extraJwtFields(req, client, user, newToken.originatingAuthCodeId);

    return await this.makeBearerTokenResponse(client, newToken, scopes, extraJwtFields);
  }

  private async validateOldRefreshToken(request: RequestInterface, clientId: string): Promise<OAuthToken> {
    const providedRefreshToken = this.getRequestParameter("refresh_token", request);

    if (!providedRefreshToken) {
      throw OAuthException.invalidParameter("refresh_token");
    }

    const { payload: refreshTokenData, token } = await this.refreshTokenEncoder.resolve(providedRefreshToken);
    let refreshToken: OAuthToken | null = token;

    if (!refreshTokenData?.refresh_token_id) {
      throw OAuthException.invalidParameter("refresh_token", "Token missing");
    }

    if (refreshTokenData?.client_id !== clientId) {
      throw OAuthException.invalidParameter("refresh_token", "Token is not linked to client");
    }

    if (refreshTokenData?.expire_time != null && Date.now() / 1000 > refreshTokenData.expire_time) {
      throw OAuthException.invalidParameter("refresh_token", "Token has expired");
    }

    if (!refreshToken) {
      refreshToken = await this.tokenRepository.getByRefreshToken(refreshTokenData.refresh_token_id);
    }

    if (await this.tokenRepository.isRefreshTokenRevoked(refreshToken)) {
      throw OAuthException.invalidParameter("refresh_token", "Token has been revoked");
    }

    return refreshToken;
  }
}
