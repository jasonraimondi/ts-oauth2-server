import {
  OAuthClient as ClientModel,
  OAuthAuthCode as AuthCodeModel,
  OAuthScope as ScopeModel,
  User as UserModel,
} from "@prisma/client";
import { OAuthAuthCode, CodeChallengeMethod } from "@jmondi/oauth2-server";

import { Client } from "./client.js";
import { Scope } from "./scope.js";
import { User } from "./user.js";

type Optional = Partial<{
  user: UserModel;
  scopes: ScopeModel[];
}>;

type Required = {
  client: ClientModel;
};

export class AuthCode implements AuthCodeModel, OAuthAuthCode {
  readonly code: string;
  codeChallenge: string | null;
  codeChallengeMethod: CodeChallengeMethod;
  redirectUri: string | null;
  user: User | null;
  userId: string | null;
  client: Client;
  clientId: string;
  expiresAt: Date;
  createdAt: Date;
  scopes: Scope[];

  constructor({ user, client, scopes, ...entity }: AuthCodeModel & Required & Optional) {
    this.code = entity.code;
    this.codeChallenge = entity.codeChallenge;
    this.codeChallengeMethod = entity.codeChallengeMethod;
    this.redirectUri = entity.redirectUri;
    this.user = user ? new User(user) : null;
    this.userId = entity.userId;
    this.client = new Client(client);
    this.clientId = entity.clientId;
    this.scopes = scopes?.map(s => new Scope(s)) ?? [];
    this.expiresAt = new Date();
    this.createdAt = new Date();
  }

  get isExpired(): boolean {
    console.log(new Date(), this.expiresAt);
    return new Date() > this.expiresAt;
  }
}
