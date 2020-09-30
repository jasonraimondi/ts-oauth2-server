import { OAuthScope } from "~/entities/scope.entity";
import { GrantIdentifier } from "~/grants/abstract/grant.interface";

export interface OAuthClient {
  id: string;
  secret?: string;
  name: string;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: OAuthScope[];
}

export function isClientConfidential(client: OAuthClient): boolean {
  return !!client.secret;
}
