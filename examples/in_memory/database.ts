import { OAuthDeviceUserCode } from "src/entities/device_user_code.entity";
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
  deviceCodes: { [id: string]: OAuthDeviceUserCode };
  flush(): void;
}

export const inMemoryDatabase: InMemory = {
  clients: {},
  authCodes: {},
  tokens: {},
  scopes: {},
  users: {},
  deviceCodes: {},
  flush() {
    this.clients = {};
    this.authCodes = {};
    this.tokens = {};
    this.scopes = {};
    this.users = {};
    this.deviceCodes = {};
  },
};

beforeEach(() => {
  inMemoryDatabase.flush();
});
