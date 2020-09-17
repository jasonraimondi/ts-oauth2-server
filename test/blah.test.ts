import {
  IAccessTokenRepository,
  IAuthCodeRepository,
  IClientRepository,
  IRefreshTokenRepository,
  IScopeRepository,
} from "../src/repositories";

import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryRefreshTokenRepository,
  inMemoryScopeRepository,
} from "../src/examples/in-memory";
import { AuthorizationServer } from "../src/authorization-server";

describe("blah", () => {
  let clientRepository: IClientRepository;
  let scopeRepository: IScopeRepository;
  let accessTokenRepository: IAccessTokenRepository;
  let authCodeRepository: IAuthCodeRepository;
  let refreshTokenRepository: IRefreshTokenRepository;

  beforeAll(() => {
    clientRepository = inMemoryClientRepository;
    scopeRepository = inMemoryScopeRepository;
    accessTokenRepository = inMemoryAccessTokenRepository;
    refreshTokenRepository = inMemoryRefreshTokenRepository;
    authCodeRepository = inMemoryAuthCodeRepository;
  });

  it("works", () => {
    const authServer = new AuthorizationServer()
  });
});
