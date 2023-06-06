import { PrismaClient } from "@prisma/client";
import { GrantIdentifier, OAuthClient, OAuthClientRepository } from "@jmondi/oauth2-server";

import { Client } from "../entities/client.js";

export class ClientRepository implements OAuthClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByIdentifier(clientId: string): Promise<Client> {
    return new Client(
      await this.prisma.oAuthClient.findUnique({
        rejectOnNotFound: true,
        where: {
          id: clientId,
        },
        include: {
          scopes: true,
        },
      }),
    );
  }

  async isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean> {
    if (client.secret && client.secret !== clientSecret) {
      return false;
    }
    return client.allowedGrants.includes(grantType);
  }
}
