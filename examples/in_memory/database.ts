import { beforeEach } from "vitest";

import { OAuthAuthCode } from "../../src/entities/auth_code.entity";
import { OAuthClient } from "../../src/entities/client.entity";
import { OAuthScope } from "../../src/entities/scope.entity";
import { OAuthToken } from "../../src/entities/token.entity";
import { OAuthUser } from "../../src/entities/user.entity";

export interface InMemory {
  users: { [id: string]: OAuthUser };
  clients: { [id: string]: OAuthClient };
  authCodes: { [id: string]: OAuthAuthCode };
  tokens: { [id: string]: OAuthToken };
  scopes: { [id: string]: OAuthScope };

  flush(): void;
}

export const inMemoryDatabase: InMemory = {
  clients: {},
  authCodes: {},
  tokens: {},
  scopes: {},
  users: {},
  flush() {
    this.clients = {};
    this.authCodes = {};
    this.tokens = {};
    this.scopes = {};
    this.users = {};
  },
};

beforeEach(() => {
  inMemoryDatabase.flush();
});
