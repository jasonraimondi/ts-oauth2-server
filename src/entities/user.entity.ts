/** The type of an {@link OAuthUser} identifier. */
export type OAuthUserIdentifier = string | number;

/**
 * The resource owner — the end-user who authorizes a client.
 *
 * Your {@link OAuthUserRepository} returns entities of this shape. Only the
 * identifier is required; the index signature lets you return your own database
 * row directly, with whatever extra columns it carries. In OIDC the identifier
 * becomes the `sub` claim, converted to a string.
 *
 * @see https://tsoauth2server.com/docs/getting_started/entities
 */
export interface OAuthUser {
  /** Unique user identifier. */
  id: OAuthUserIdentifier;

  [key: string]: any;
}
