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
  clients: [
    {
      id: "abc123",
      secret: "i am a secret",
      name: "testing client",
      redirectUris: ["http://localhost"],
      isConfidential: false,
      allowedGrants: [],
    },
  ],
  authCodes: [],
  accessTokens: [],
  refreshTokens: [],
  scopes: [],
  users: [],
};
