import { RequestInterface } from "../requests/request.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant } from "./abstract/abstract.grant.js";
import { OAuthClientRepository } from "../repositories/client.repository.js";
import { OAuthTokenRepository } from "../repositories/access_token.repository.js";
import { OAuthScopeRepository } from "../repositories/scope.repository.js";
import { JwtInterface } from "../utils/jwt.js";
import { AuthorizationServerOptions } from "../authorization_server.js";
import { OAuthUser } from "../entities/user.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { OAuthScope } from "../entities/scope.entity.js";

export type ProcessTokenExchangeArgs = {
  resource?: string;
  audience?: string;
  scopes: OAuthScope[];
  requestedTokenType?: string;
  subjectToken: string;
  subjectTokenType: `urn:${string}:oauth:token-type:${string}`;
} & ({ actorToken: string; actorTokenType: string } | { actorToken?: never; actorTokenType?: never });

export type ProcessTokenExchangeFn = (args: ProcessTokenExchangeArgs) => Promise<OAuthUser | undefined>;

export class TokenExchangeGrant extends AbstractGrant {
  readonly identifier = "urn:ietf:params:oauth:grant-type:token-exchange";

  readonly SUBJECT_TOKEN_TYPE_REGEX = /^urn:.+:oauth:token-type:.+$/;

  constructor(
    private readonly processTokenExchangeFn: ProcessTokenExchangeFn,
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

    const subjectToken = this.getRequestParameter("subject_token", req);

    const subjectTokenType = this.getRequestParameter("subject_token_type", req);

    if (typeof subjectToken !== "string") {
      throw OAuthException.badRequest("subject_token is required");
    }

    if (!this.isSubjectTokenType(subjectTokenType)) {
      // https://datatracker.ietf.org/doc/html/rfc8693#section-3
      throw OAuthException.badRequest(`subject_token_type is required in format ${this.SUBJECT_TOKEN_TYPE_REGEX}`);
    }

    const actorToken = this.getRequestParameter("actor_token", req);

    const actorTokenType = this.getRequestParameter("actor_token_type", req);

    if (actorToken && !actorTokenType) {
      throw OAuthException.badRequest("actor_token_type is required when the actor_token parameter is present");
    }

    const bodyScopes = this.getRequestParameter("scope", req, []);

    const validScopes = await this.validateScopes(bodyScopes);

    const user = await this.processTokenExchangeFn({
      resource: this.getRequestParameter("resource", req),
      audience: this.getRequestParameter("audience", req),
      scopes: validScopes,
      requestedTokenType: this.getRequestParameter("requested_token_type", req),
      subjectToken,
      subjectTokenType,
      actorToken,
      actorTokenType,
    });

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, validScopes);

    const extraJwtFields = await this.jwt.extraTokenFields?.({ user, client });

    return await this.makeBearerTokenResponse(client, accessToken, validScopes, extraJwtFields);
  }

  private isSubjectTokenType(value: string): value is `urn:${string}:oauth:token-type:${string}` {
    return this.SUBJECT_TOKEN_TYPE_REGEX.test(value);
  }
}
