import { GrantIdentifier } from "../grants/abstract/grant.interface";
import { OAuthScope } from "./scope.entity";

export interface OAuthClient {
  id: string;
  name: string;
  secret?: string;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: OAuthScope[];
}

export function isClientConfidential(client: OAuthClient): boolean {
  return !!client.secret;
}
