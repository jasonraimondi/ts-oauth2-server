import { getRepository } from "typeorm";
import { GrantIdentifier, OAuthClient, OAuthClientRepository } from "../../../src";
import OAuthClientImp from "../entities/oauthClient";

export const clientRepository: OAuthClientRepository = {
  // Fetch client entity from storage by client_id
  async getByIdentifier(clientId: string): Promise<OAuthClient> {
    const clientRepo = getRepository(OAuthClientImp, process.env.NODE_ENV);
    const client = await clientRepo.findOne({ id: clientId }, { relations: ["scopes"] });
    return client as OAuthClient;
  },
  // check the grant type and secret against the client
  async isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean> {
    if (client.secret && client.secret !== clientSecret) {
      return false;
    }
    return client.allowedGrants.includes(grantType);
  },
};
