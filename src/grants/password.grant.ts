import { OAuthClient } from "../entities/client.entity";
import { OAuthUser } from "../entities/user.entity";
import { OAuthException } from "../exceptions/oauth.exception";
import { OAuthTokenRepository } from "../repositories/access_token.repository";
import { OAuthClientRepository } from "../repositories/client.repository";
import { OAuthScopeRepository } from "../repositories/scope.repository";
import { OAuthUserRepository } from "../repositories/user.repository";
import { RequestInterface } from "../requests/request";
import { ResponseInterface } from "../responses/response";
import { DateInterval } from "../utils/date_interval";
import { JwtInterface } from "../utils/jwt";
import { AbstractGrant } from "./abstract/abstract.grant";

export class PasswordGrant extends AbstractGrant {
  readonly identifier = "password";

  constructor(
    protected readonly userRepository: OAuthUserRepository,
    clientRepository: OAuthClientRepository,
    tokenRepository: OAuthTokenRepository,
    scopeRepository: OAuthScopeRepository,
    jwt: JwtInterface,
  ) {
    super(clientRepository, tokenRepository, scopeRepository, jwt);
  }

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

    accessToken = await this.issueRefreshToken(accessToken, client);

    const extraJwtFields = await this.jwt.extraTokenFields?.({ user, client });

    return await this.makeBearerTokenResponse(client, accessToken, finalizedScopes, extraJwtFields);
  }

  private async validateUser(request: RequestInterface, client: OAuthClient): Promise<OAuthUser> {
    const username = this.getRequestParameter("username", request);

    if (!username) {
      throw OAuthException.invalidParameter("username");
    }

    const password = this.getRequestParameter("password", request);

    if (!password) {
      throw OAuthException.invalidParameter("password");
    }

    const user = await this.userRepository.getUserByCredentials(username, password, this.identifier, client);

    if (!user) {
      throw OAuthException.invalidGrant();
    }

    return user;
  }
}
