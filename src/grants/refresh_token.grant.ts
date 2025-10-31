import { OAuthToken } from "../entities/token.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { RequestInterface } from "../requests/request.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant } from "./abstract/abstract.grant.js";

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

    let refreshTokenData: any;
    let refreshToken: OAuthToken | null = null;

    if (this.options.useOpaqueRefreshTokens) {
      refreshToken = await this.tokenRepository.getByRefreshToken(providedRefreshToken);
      refreshTokenData = {
        refresh_token_id: refreshToken.refreshToken,
        client_id: refreshToken.client.id,
        expire_time: refreshToken.refreshTokenExpiresAt,
      };
    } else {
      try {
        refreshTokenData = await this.decrypt(providedRefreshToken);
      } catch (e) {
        if (e instanceof Error && e.message === "invalid signature") {
          throw OAuthException.invalidParameter("refresh_token", "Cannot verify the refresh token");
        }
        throw OAuthException.invalidParameter("refresh_token", "Cannot decrypt the refresh token");
      }
    }

    if (!refreshTokenData?.refresh_token_id) {
      throw OAuthException.invalidParameter("refresh_token", "Token missing");
    }

    if (refreshTokenData?.client_id !== clientId) {
      throw OAuthException.invalidParameter("refresh_token", "Token is not linked to client");
    }

    if (Date.now() / 1000 > refreshTokenData?.expire_time) {
      throw OAuthException.invalidParameter("refresh_token", "Token has expired");
    }

    refreshToken ??= await this.tokenRepository.getByRefreshToken(refreshTokenData.refresh_token_id);

    if (await this.tokenRepository.isRefreshTokenRevoked(refreshToken)) {
      throw OAuthException.invalidParameter("refresh_token", "Token has been revoked");
    }

    return refreshToken;
  }
}
