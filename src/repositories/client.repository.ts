import { OAuthClient } from "../entities/client.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant_identifier.js";

/**
 * Storage for registered clients. Every grant uses it: first to look the client
 * up by its identifier, then to authenticate it. Required by the
 * {@link AuthorizationServer} constructor.
 *
 * @see https://tsoauth2server.com/docs/getting_started/repositories
 */
export interface OAuthClientRepository {
  /**
   * Fetches a client entity from storage by client ID.
   * @param clientId The client identifier string
   * @returns Promise resolving to an OAuthClient
   */
  getByIdentifier(clientId: string): Promise<OAuthClient>;

  /**
   * Validates the client using the grant type and optional client secret.
   *
   * Secret verification must be grant-independent: the revoke/introspect
   * identity check (`AbstractGrant.validateClientIdentity`) may call this with
   * any grant the client holds, not just the one being exercised.
   * @param grantType The grant type identifier
   * @param client The OAuth client entity
   * @param clientSecret Optional client secret string
   * @returns Promise resolving to a boolean indicating validity
   */
  isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean>;
}
