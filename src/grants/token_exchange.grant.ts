import { RequestInterface } from "../requests/request.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant } from "./abstract/abstract.grant.js";
import { OAuthClientRepository } from "../repositories/client.repository.js";
import { OAuthTokenRepository } from "../repositories/access_token.repository.js";
import { OAuthScopeRepository } from "../repositories/scope.repository.js";
import { JwtInterface } from "../utils/jwt.js";
import { AuthorizationServerOptions } from "../options.js";
import { OAuthUser } from "../entities/user.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { OAuthScope } from "../entities/scope.entity.js";

/**
 * What the token exchange grant passes to your
 * {@link ProcessTokenExchangeFn}: the presented subject token and its type,
 * the Requested Scopes, and the optional actor token that names the party
 * acting for the subject. An actor token must come with its type.
 */
export type ProcessTokenExchangeArgs = {
  resource?: string;
  audience?: string;
  scopes: OAuthScope[];
  requestedTokenType?: string;
  subjectToken: string;
  subjectTokenType: `urn:${string}:oauth:token-type:${string}`;
} & ({ actorToken: string; actorTokenType: string } | { actorToken?: never; actorTokenType?: never });

/**
 * Validates a token exchange request (RFC 8693). The library does not interpret
 * the presented tokens, so this callback must verify them and return the user
 * the new access token belongs to. Return `undefined`, or throw an
 * {@link OAuthException}, to refuse the exchange.
 *
 * @see https://tsoauth2server.com/docs/grants/token_exchange
 */
export type ProcessTokenExchangeFn = (args: ProcessTokenExchangeArgs) => Promise<OAuthUser | undefined>;

/**
 * The `urn:ietf:params:oauth:grant-type:token-exchange` grant (RFC 8693). A
 * client presents a subject token — and optionally an actor token — at `/token`
 * and receives an access token in exchange. Use it for impersonation and
 * delegation between services.
 *
 * The library does not interpret the presented tokens. Your
 * {@link ProcessTokenExchangeFn} validates them and returns the user the new
 * token belongs to. Enable the grant with
 * `enableGrantType({ grant: "urn:ietf:params:oauth:grant-type:token-exchange", processTokenExchange })`.
 *
 * @see https://tsoauth2server.com/docs/grants/token_exchange
 */
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

    if (typeof subjectToken !== "string") {
      throw OAuthException.badRequest("subject_token is required");
    }

    const subjectTokenType = this.getRequestParameter("subject_token_type", req);

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

    // Finalize scopes with user_id to validate client authorization
    // and allow user-specific scope restrictions
    const finalizedScopes = await this.scopeRepository.finalize(validScopes, this.identifier, client, user?.id);

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, finalizedScopes);

    const extraJwtFields = await this.extraJwtFields(req, client, user);

    return await this.makeBearerTokenResponse(client, accessToken, finalizedScopes, extraJwtFields);
  }

  private isSubjectTokenType(value: string): value is `urn:${string}:oauth:token-type:${string}` {
    return this.SUBJECT_TOKEN_TYPE_REGEX.test(value);
  }
}
