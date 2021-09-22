export type OAuthUserIdentifier = string | number;

export interface OAuthUser {
  id: OAuthUserIdentifier;
  [key: string]: any;
}
