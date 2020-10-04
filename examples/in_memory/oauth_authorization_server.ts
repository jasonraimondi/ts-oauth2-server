import { AuthorizationServer } from "../../src/authorization_server";
import { DateInterval } from "../../src/utils/date_interval";
import { JwtService } from "../../src/utils/jwt";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "./repository";

const clientRepository = inMemoryClientRepository;
const authCodeRepository = inMemoryAuthCodeRepository;
const tokenRepository = inMemoryAccessTokenRepository;
const scopeRepository = inMemoryScopeRepository;
const userRepository = inMemoryUserRepository;

const jwtService = new JwtService("secret secret secret");

const authorizationServer = new AuthorizationServer(
  authCodeRepository,
  clientRepository,
  tokenRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

authorizationServer.enableGrantType("authorization_code", new DateInterval("1m"));
authorizationServer.enableGrantType("client_credentials", new DateInterval("1m"));
authorizationServer.enableGrantType("implicit", new DateInterval("1m"));
authorizationServer.enableGrantType("password", new DateInterval("1m"));
authorizationServer.enableGrantType("refresh_token", new DateInterval("1m"));

export { authorizationServer as inMemoryAuthorizationServer };
