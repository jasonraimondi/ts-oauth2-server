import { AuthorizationServer } from "~/authorization_server";
import { AuthCodeGrant } from "~/grants/auth_code.grant";
import { ClientCredentialsGrant } from "~/grants/client_credentials.grant";
import { ImplicitGrant } from "~/grants/implicit.grant";
import { PasswordGrant } from "~/grants/password.grant";
import { RefreshTokenGrant } from "~/grants/refresh_token.grant";
import { JWT } from "~/utils/jwt";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "./repository";

const clientRepository = inMemoryClientRepository;
const accessTokenRepository = inMemoryAccessTokenRepository;
const authCodeRepository = inMemoryAuthCodeRepository;
const scopeRepository = inMemoryScopeRepository;
const userRepository = inMemoryUserRepository;

const jwtService = new JWT("secret secret secret");

export const clientCredentialsGrant = new ClientCredentialsGrant(
  clientRepository,
  accessTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

export const authCodeGrant = new AuthCodeGrant(
  clientRepository,
  accessTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

export const refreshTokenGrant = new RefreshTokenGrant(
  clientRepository,
  accessTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

export const passwordGrant = new PasswordGrant(
  clientRepository,
  accessTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

export const implicitGrant = new ImplicitGrant(
  clientRepository,
  accessTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

const authorizationServer = new AuthorizationServer();
authorizationServer.enableGrantType(clientCredentialsGrant);
authorizationServer.enableGrantType(authCodeGrant);
authorizationServer.enableGrantType(refreshTokenGrant);
authorizationServer.enableGrantType(passwordGrant);
authorizationServer.enableGrantType(implicitGrant);

export { authorizationServer as inMemoryAuthorizationServer };
