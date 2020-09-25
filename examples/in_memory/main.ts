import { AuthCodeGrant, AuthorizationServer, ClientCredentialsGrant, JwtService } from "../../src";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryRefreshTokenRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "./repository";

const clientRepository = inMemoryClientRepository;
const accessTokenRepository = inMemoryAccessTokenRepository;
const refreshTokenRepository = inMemoryRefreshTokenRepository;
const authCodeRepository = inMemoryAuthCodeRepository;
const scopeRepository = inMemoryScopeRepository;
const userRepository = inMemoryUserRepository;
const jwt: JwtService = {
  decode(encryptedData: string): any {
    console.log("DECODE");
  },
  sign(data: object, options: { expiresIn: number }): string {
    console.log("SIGN");
    return "";
  },
  signAsync(unencryptedData: string): Promise<string> {
    console.log("SIGN ASYNC");
    return Promise.resolve("");
  },
};

const clientCredentialsGrant = new ClientCredentialsGrant(
  clientRepository,
  accessTokenRepository,
  refreshTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwt,
);

const authCodeGrant = new AuthCodeGrant(
  clientRepository,
  accessTokenRepository,
  refreshTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwt,
);

const authorizationServer = new AuthorizationServer();
authorizationServer.enableGrantType(clientCredentialsGrant);
authorizationServer.enableGrantType(authCodeGrant);

export { authorizationServer as inMemoryAuthorizationServer };
