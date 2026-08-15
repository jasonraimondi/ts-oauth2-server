/**
 * The `grant_type` value that identifies a grant. A custom grant uses a
 * `custom:` prefix, which keeps it distinct from the built-in grants.
 */
export type GrantIdentifier =
  | "authorization_code"
  | "client_credentials"
  | "refresh_token"
  | "password"
  | "implicit"
  | "urn:ietf:params:oauth:grant-type:token-exchange"
  | `custom:${string}`;
