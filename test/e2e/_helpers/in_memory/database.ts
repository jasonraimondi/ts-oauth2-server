import { beforeEach } from "vitest";

import { OAuthAuthCode } from "../../../../src/entities/auth_code.entity.js";
import { OAuthClient } from "../../../../src/entities/client.entity.js";
import { OAuthScope } from "../../../../src/entities/scope.entity.js";
import { OAuthToken } from "../../../../src/entities/token.entity.js";
import { OAuthUser } from "../../../../src/entities/user.entity.js";

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
