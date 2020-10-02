import { OAuthClient } from "~/entities/client.entity";
import { OAuthUser } from "~/entities/user.entity";
import { OAuthException } from "~/exceptions/oauth.exception";
import { AbstractGrant } from "~/grants/abstract/abstract.grant";
import { RequestInterface } from "~/requests/request";
import { ResponseInterface } from "~/responses/response";
import { DateInterval } from "~/utils/date_interval";

export class PasswordGrant extends AbstractGrant {
  readonly identifier = "password";

  async respondToAccessTokenRequest(
    request: RequestInterface,
    response: ResponseInterface,
    accessTokenTTL: DateInterval,
  ): Promise<ResponseInterface> {
    const client = await this.validateClient(request);

    const bodyScopes = this.getRequestParameter("scope", request, []);

    const user = await this.validateUser(request, client);

    const finalizedScopes = await this.scopeRepository.finalizeScopes(
      await this.validateScopes(bodyScopes),
      this.identifier,
      client,
      user.identifier,
    );

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, finalizedScopes);

    const [refreshToken, refreshTokenExpiresAt] = await this.issueRefreshToken();

    accessToken.refreshToken = refreshToken;
    accessToken.refreshTokenExpiresAt = refreshTokenExpiresAt;

    return await this.makeBearerTokenResponse(client, accessToken, finalizedScopes);
  }

  private async validateUser(request: RequestInterface, client: OAuthClient): Promise<OAuthUser> {
    const username = this.getRequestParameter("username", request);

    if (!username) {
      throw OAuthException.invalidRequest("username");
    }

    const password = this.getRequestParameter("password", request);

    if (!password) {
      throw OAuthException.invalidRequest("password");
    }

    const user = await this.userRepository.getByUserEntityByCredentials(username, password, this.identifier, client);

    if (!user) {
      throw OAuthException.invalidGrant();
    }

    return user;
  }
}
