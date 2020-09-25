import { GrantTypeIdentifiers } from "../grants";
import { OAuthClient } from "../entities";

export interface OAuthClientRepository {
  getClientByIdentifier(clientId: string): Promise<OAuthClient>;

  isClientValid(grantType: GrantTypeIdentifiers, clientId: string, clientSecret?: string): Promise<boolean>;
}
