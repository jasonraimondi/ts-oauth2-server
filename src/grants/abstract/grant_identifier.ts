export type GrantIdentifier =
  | "authorization_code"
  | "client_credentials"
  | "refresh_token"
  | "password"
  | "implicit"
  | "urn:ietf:params:oauth:grant-type:token-exchange"
  | `custom:${string}`;
