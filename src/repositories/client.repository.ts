import { OAuthClient } from "../entities/client.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant.interface.js";

export interface OAuthClientRepository {
  /**
   * Fetches a client entity from storage by client ID.
   * @param clientId The client identifier string
   * @returns Promise resolving to an OAuthClient
   */
  getByIdentifier(clientId: string): Promise<OAuthClient>;

  /**
   * Validates the client using the grant type and optional client secret.
   * @param grantType The grant type identifier
   * @param client The OAuth client entity
   * @param clientSecret Optional client secret string
   * @returns Promise resolving to a boolean indicating validity
   */
  isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean>;
}
