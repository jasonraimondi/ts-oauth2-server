import { DateInterval } from "~/authorization_server";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";
import { OAuthException } from "~/exceptions/oauth.exception";
import { AbstractGrant } from "~/grants/abstract.grant";
import { RequestInterface } from "~/requests/request";
import { ResponseInterface } from "~/responses/response";

export class RefreshTokenGrant extends AbstractGrant {
  readonly identifier = "refresh_token";

  async respondToAccessTokenRequest(
    request: RequestInterface,
    response: ResponseInterface,
    accessTokenTTL: DateInterval,
  ): Promise<ResponseInterface> {
    const client = await this.validateClient(request);

    const oldRefreshToken = await this.validateOldRefreshToken(request, client.id);

    const userId = oldRefreshToken.accessToken.user?.id;

    const scopes = await this.validateScopes(
      this.getRequestParameter("scope", request, oldRefreshToken.accessToken.scopes),
    );

    scopes.forEach((scope) => {
      if (!oldRefreshToken.accessToken.scopes.map((scope) => scope.name).includes(scope.name)) {
        throw OAuthException.invalidScope(scope.name);
      }
    });

    await this.accessTokenRepository.revokeAccessToken(oldRefreshToken.accessToken);

    await this.refreshTokenRepository.revokeRefreshToken(oldRefreshToken);

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, userId, scopes);

    const refreshToken = await this.issueRefreshToken(accessToken);

    return await this.makeBearerTokenResponse(client, accessToken, refreshToken, userId, scopes);
  }

  private async validateOldRefreshToken(request: RequestInterface, clientId: string): Promise<OAuthRefreshToken> {
    const encryptedRefreshToken = this.getRequestParameter("refresh_token", request);

    if (!encryptedRefreshToken) {
      throw OAuthException.invalidRequest("refresh_token");
    }

    let refreshTokenData: any;

    try {
      refreshTokenData = await this.decrypt(encryptedRefreshToken);
    } catch (e) {
      if (e.message === "invalid signature") {
        throw OAuthException.invalidRequest("refresh_token", "Cannot verify the refresh token");
      }
      throw OAuthException.invalidRequest("refresh_token", "Cannot decrypt the refresh token");
    }

    if (!refreshTokenData?.refresh_token_id) {
      throw OAuthException.invalidRequest("refresh_token", "Token missing");
    }

    if (refreshTokenData?.client_id !== clientId) {
      throw OAuthException.invalidRequest("refresh_token", "Token is not linked to client");
    }

    if (Date.now() / 1000 > refreshTokenData?.expire_time) {
      throw OAuthException.invalidRequest("refresh_token", "Token has expired");
    }

    const refreshToken = await this.refreshTokenRepository.getRefreshToken(refreshTokenData.refresh_token_id);

    if (await this.refreshTokenRepository.isRefreshTokenRevoked(refreshToken)) {
      throw OAuthException.invalidRequest("refresh_token", "Token has been revoked");
    }

    return refreshToken;
  }
}
