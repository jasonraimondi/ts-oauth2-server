import { GrantIdentifier } from "../grants";
import { OAuthClient } from "../entities";

export interface OAuthClientRepository {
  getClientByIdentifier(clientId: string): Promise<OAuthClient>;

  isClientValid(grantType: GrantIdentifier, clientId: string, clientSecret?: string): Promise<boolean>;
}
