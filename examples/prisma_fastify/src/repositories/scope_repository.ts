import { Prisma } from "@prisma/client";

import { GrantIdentifier, OAuthScope, OAuthScopeRepository } from "../../../../src";
import { Client } from "../entities/client";
import { Scope } from "../entities/scope";

export class ScopeRepository implements OAuthScopeRepository {
  constructor(private readonly repo: Prisma.OAuthScopeDelegate<"rejectOnNotFound">) {}

  async getAllByIdentifiers(scopeNames: string[]): Promise<Scope[]> {
    const scopes = await this.repo.findMany({
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
