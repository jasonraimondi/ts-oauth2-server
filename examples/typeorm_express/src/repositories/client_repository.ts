import { Repository } from "typeorm";

import { GrantIdentifier, OAuthClient, OAuthClientRepository } from "../../../../src";
import { Client } from "../entities/client";

export class ClientRepository implements OAuthClientRepository {
  constructor(private readonly clientRepo: Repository<Client>) {
  }
  
  async getByIdentifier(clientId: string): Promise<Client> {
    return this.clientRepo.findOneOrFail(clientId, { relations: ["scopes"] });
  }

  async isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean> {
    if (client.secret && client.secret !== clientSecret) {
      return false;
    }
    return client.allowedGrants.includes(grantType);
  }
}
