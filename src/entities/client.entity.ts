import { GrantIdentifier } from "../grants/abstract/grant.interface.js";
import { OAuthScope } from "./scope.entity.js";

export type OAuthClientIdentifier = string | number;

export interface OAuthClient {
  id: OAuthClientIdentifier;
  name: string;
  secret?: string | null;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: OAuthScope[];
  [key: string]: any;
}

export function isClientConfidential(client: OAuthClient): boolean {
  return !!client.secret;
}
