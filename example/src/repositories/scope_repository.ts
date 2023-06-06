import { PrismaClient } from "@prisma/client";
import { GrantIdentifier, OAuthScope, OAuthScopeRepository } from "@jmondi/oauth2-server";

import { Client } from "../entities/client.js";
import { Scope } from "../entities/scope.js";

export class ScopeRepository implements OAuthScopeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getAllByIdentifiers(scopeNames: string[]): Promise<Scope[]> {
    const scopes = await this.prisma.oAuthScope.findMany({
      where: {
        name: {
          in: scopeNames,
        },
      },
    });
    return scopes.map(s => new Scope(s));
  }

  async finalize(
    scopes: OAuthScope[],
    _identifier: GrantIdentifier,
    _client: Client,
    _user_id?: string,
  ): Promise<OAuthScope[]> {
    return scopes;
  }
}
