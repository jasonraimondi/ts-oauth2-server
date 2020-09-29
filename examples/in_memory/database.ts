import { OAuthAccessToken } from "~/entities/access_token.entity";
import { OAuthAuthCode } from "~/entities/auth_code.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";

export interface InMemory {
  users: OAuthUser[];
  clients: OAuthClient[];
  authCodes: OAuthAuthCode[];
  accessTokens: OAuthAccessToken[];
  refreshTokens: OAuthRefreshToken[];
  scopes: OAuthScope[];

  flush(): void;
}

export const inMemoryDatabase: InMemory = {
  clients: [],
  authCodes: [],
  accessTokens: [],
  refreshTokens: [],
  scopes: [],
  users: [],
  flush() {
    this.clients = [];
    this.authCodes = [];
    this.accessTokens = [];
    this.refreshTokens = [];
    this.scopes = [];
    this.users = [];
  },
};

beforeEach(() => {
  inMemoryDatabase.flush();
});
