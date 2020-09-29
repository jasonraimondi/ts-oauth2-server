import { AuthorizationServer } from "~/authorization_server";
import { AuthCodeGrant } from "~/grants/auth_code.grant";
import { ClientCredentialsGrant } from "~/grants/client_credentials.grant";
import { JWT } from "~/utils/jwt";
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

const jwtService = new JWT("secret secret secret");

export const clientCredentialsGrant = new ClientCredentialsGrant(
  clientRepository,
  accessTokenRepository,
  refreshTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

export const authCodeGrant = new AuthCodeGrant(
  clientRepository,
  accessTokenRepository,
  refreshTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

const authorizationServer = new AuthorizationServer();
authorizationServer.enableGrantType(clientCredentialsGrant);
authorizationServer.enableGrantType(authCodeGrant);

export { authorizationServer as inMemoryAuthorizationServer };
