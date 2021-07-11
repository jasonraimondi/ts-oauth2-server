import { In, Repository } from "typeorm";
import { GrantIdentifier, OAuthScope, OAuthScopeRepository } from "@jmondi/oauth2-server";

import { Client } from "../entities/client";
import { Scope } from "../entities/scope";

export class ScopeRepository implements OAuthScopeRepository {
  constructor(private readonly scopeRepo: Repository<Scope>) {}

  async getAllByIdentifiers(scopeNames: string[]): Promise<OAuthScope[]> {
    return this.scopeRepo.find({ where: { name: In([...scopeNames]) } });
  }

  async finalize(
    scopes: OAuthScope[],
    identifier: GrantIdentifier,
    client: Client,
    user_id?: string,
  ): Promise<OAuthScope[]> {
    return scopes;
  }
}
