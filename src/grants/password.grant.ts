import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser } from "../entities/user.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { OAuthTokenRepository } from "../repositories/access_token.repository.js";
import { OAuthClientRepository } from "../repositories/client.repository.js";
import { OAuthScopeRepository } from "../repositories/scope.repository.js";
import { OAuthUserRepository } from "../repositories/user.repository.js";
import { RequestInterface } from "../requests/request.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { JwtInterface } from "../utils/jwt.js";
import { AbstractGrant } from "./abstract/abstract.grant.js";
import { AuthorizationServerOptions } from "../authorization_server.js";

export class PasswordGrant extends AbstractGrant {
  readonly identifier = "password";

  constructor(
    protected readonly userRepository: OAuthUserRepository,
    clientRepository: OAuthClientRepository,
    tokenRepository: OAuthTokenRepository,
    scopeRepository: OAuthScopeRepository,
    jwt: JwtInterface,
    options: AuthorizationServerOptions,
  ) {
    super(clientRepository, tokenRepository, scopeRepository, jwt, options);
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
