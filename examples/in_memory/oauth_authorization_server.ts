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

import jwt, { Secret, VerifyOptions } from "jsonwebtoken";

export class JWT implements JwtService {
  constructor(private readonly secretOrPrivateKey: Secret) {}

  // Asynchronously verify given token using a secret or a public key to get a decoded token
  verify(token: string, options: VerifyOptions): Promise<object> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secretOrPrivateKey, (err, decoded) => {
        if (decoded) resolve(decoded);
        else reject(err);
      });
    });
  }

  // Returns the decoded payload without verifying if the signature is valid.
  decode(encryptedData: string): null | { [key: string]: any } | string {
    return jwt.decode(encryptedData);
  }

  // Sign the given payload into a JSON Web Token string
  sign(payload: string | Buffer | object): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.secretOrPrivateKey, (err, encoded) => {
        if (encoded) resolve(encoded);
        else reject(err);
      });
    });
  }
}

const jwtService = new JWT("secret secret secret");

const clientCredentialsGrant = new ClientCredentialsGrant(
  clientRepository,
  accessTokenRepository,
  refreshTokenRepository,
  authCodeRepository,
  scopeRepository,
  userRepository,
  jwtService,
);

const authCodeGrant = new AuthCodeGrant(
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
