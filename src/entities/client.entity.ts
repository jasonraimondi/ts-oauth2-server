import { GrantIdentifier } from "../grants/abstract/grant_identifier.js";
import { OAuthScope } from "./scope.entity.js";

/**
 * A registered application that requests tokens from the authorization server.
 * In OpenID Connect this is the "Relying Party".
 *
 * Your {@link OAuthClientRepository} returns entities of this shape. The index
 * signature lets you return your own database row directly, with whatever extra
 * columns it carries.
 *
 * @see https://tsoauth2server.com/docs/getting_started/entities
 */
export interface OAuthClient {
  /** Unique client identifier, sent as the `client_id` request parameter. */
  id: string;

  /** Human-readable name, for consent screens and logs. */
  name: string;

  /**
   * The client secret. A client with a secret is a Confidential Client; a
   * client without one is a Public Client. The library never compares this
   * value itself — {@link OAuthClientRepository.isClientValid} does — so you can
   * store a hash here, or omit the field and hold the secret elsewhere.
   */
  secret?: string | null;

  /**
   * The callback URIs this client may be redirected to. A requested
   * `redirect_uri` must match one of these exactly after URL normalization.
   * Only the port of an `http` loopback URI (`localhost`, `127.0.0.1`, `[::1]`)
   * may differ.
   */
  redirectUris: string[];

  /** The grants this client may use. A request for any other grant is rejected. */
  allowedGrants: GrantIdentifier[];

  /** The scopes this client may request. A request for any other scope is rejected. */
  scopes: OAuthScope[];

  [key: string]: any;
}

/**
 * Reports whether a client is a Confidential Client, which means it is
 * registered with a secret. Introspection requires one by default.
 *
 * @param client - The client entity to inspect
 * @returns `true` when the client has a secret
 */
export function isClientConfidential(client: OAuthClient): boolean {
  return !!client.secret;
}
