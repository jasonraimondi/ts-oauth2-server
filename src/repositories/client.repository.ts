import { OAuthClient } from "../entities/client.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant.interface.js";

export interface OAuthClientRepository {
  getByIdentifier(clientId: string): Promise<OAuthClient>;

  isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean>;
}
