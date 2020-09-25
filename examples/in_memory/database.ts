import {
  OAuthAccessToken,
  OAuthAuthCode,
  OAuthClient,
  OAuthRefreshToken,
  OAuthScope,
  OAuthUser,
} from "../../src/entities";

export interface InMemory {
  users: OAuthUser[];
  clients: OAuthClient[];
  authCodes: OAuthAuthCode[];
  accessTokens: OAuthAccessToken[];
  refreshTokens: OAuthRefreshToken[];
  scopes: OAuthScope[];
}

export const inMemoryDatabase: InMemory = {
  clients: [],
  authCodes: [],
  accessTokens: [],
  refreshTokens: [],
  scopes: [],
  users: [],
};
