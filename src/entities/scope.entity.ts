/**
 * A permission a client can request and a token can carry.
 *
 * Your {@link OAuthScopeRepository} returns entities of this shape. The index
 * signature lets you return your own database row directly, with whatever extra
 * columns it carries.
 *
 * @see https://tsoauth2server.com/docs/getting_started/entities
 */
export interface OAuthScope {
  /** The scope name, as it appears in the `scope` request and response parameter. */
  name: string;

  [key: string]: any;
}
