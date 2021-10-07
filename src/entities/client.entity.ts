import { GrantIdentifier } from "../grants/abstract/grant.interface";

export interface OAuthClient {
  id: string;
  name: string;
  secret?: string | null;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopeNames: string[];
}

export function isClientConfidential(client: OAuthClient): boolean {
  return !!client.secret;
}
