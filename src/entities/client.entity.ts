import { GrantIdentifier } from "~/grants/grant.interface";

export interface OAuthClient {
  id: string;
  secret?: string;
  name: string;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
}

export function isClientConfidential(client: OAuthClient): boolean {
  return !!client.secret;
}
