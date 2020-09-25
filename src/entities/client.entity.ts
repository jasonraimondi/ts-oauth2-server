import { GrantTypeIdentifiers } from "../grants/interfaces";

export interface OAuthClient {
  id: string;
  secret?: string;
  name: string;
  redirectUris: string[];
  allowedGrants: GrantTypeIdentifiers[];
  isConfidential: boolean;
}
