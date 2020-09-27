import { GrantIdentifier } from "../grants/grant.interface";

export interface OAuthClient {
  id: string;
  secret?: string;
  name: string;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  isConfidential: boolean;
}
