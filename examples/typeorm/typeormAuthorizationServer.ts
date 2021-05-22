import { AuthorizationServer, JwtService } from "../../src";
import { authCodeRepository } from "./repositories/authCodeRepository";
import { clientRepository } from "./repositories/clientRepository";
import { scopeRepository } from "./repositories/scopeRepository";
import { tokenRepository } from "./repositories/tokenRepository";
import { userRepository } from "./repositories/userRepository";

export const typeormAuthorizationServer = new AuthorizationServer(
  authCodeRepository,
  clientRepository,
  tokenRepository,
  scopeRepository,
  userRepository,
  new JwtService(process.env.OAUTH_CODES_SECRET as string),
  {
    requiresPKCE: false, // default is true
  },
);

typeormAuthorizationServer.enableGrantType("authorization_code");
typeormAuthorizationServer.enableGrantType("client_credentials");
typeormAuthorizationServer.enableGrantType("refresh_token");
typeormAuthorizationServer.enableGrantType("password");
typeormAuthorizationServer.enableGrantType("implicit");
