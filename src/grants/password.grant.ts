import { OAuthClient } from "../entities/client.entity";
import { OAuthUser } from "../entities/user.entity";
import { OAuthException } from "../exceptions/oauth.exception";
import { RequestInterface } from "../requests/request";
import { ResponseInterface } from "../responses/response";
import { DateInterval } from "../utils/date_interval";
import { AbstractGrant } from "./abstract/abstract.grant";

export class PasswordGrant extends AbstractGrant {
  readonly identifier = "password";

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const bodyScopes = this.getRequestParameter("scope", req, []);

    const user = await this.validateUser(req, client);

    const finalizedScopes = await this.scopeRepository.finalize(
      await this.validateScopes(bodyScopes),
      this.identifier,
      client,
      user.id,
    );

    let accessToken = await this.issueAccessToken(accessTokenTTL, client, user, finalizedScopes);

    accessToken = await this.issueRefreshToken(accessToken);

    const extraJwtFields = await this.userRepository.extraAccessTokenFields?.(user);

    return await this.makeBearerTokenResponse(client, accessToken, finalizedScopes, extraJwtFields);
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

    const user = await this.userRepository.getUserByCredentials(username, password, this.identifier, client);

    if (!user) {
      throw OAuthException.invalidGrant();
    }

    return user;
  }
}
