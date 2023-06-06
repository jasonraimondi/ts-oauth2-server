import { OAuthClient as ClientModel, OAuthScope as ScopeModel } from "@prisma/client";
import { GrantIdentifier, OAuthClient } from "@jmondi/oauth2-server";

import { Scope } from "./scope.js";

type Relations = {
  scopes: ScopeModel[];
};

export class Client implements ClientModel, OAuthClient {
  readonly id: string;
  name: string;
  secret: string | null;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: Scope[];
  createdAt: Date;

  constructor({ scopes, ...entity }: ClientModel & Partial<Relations>) {
    this.id = entity.id;
    this.name = entity.name;
    this.secret = entity.secret ?? null;
    this.redirectUris = entity.redirectUris;
    this.allowedGrants = entity.allowedGrants;
    this.scopes = scopes?.map(s => new Scope(s)) ?? [];
    this.createdAt = new Date();
  }
}
