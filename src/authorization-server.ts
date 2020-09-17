import { IAccessTokenRepository, IClientRepository, IScopeRepository } from "./repositories";

export class AuthorizationServer {
  constructor(
    private readonly clientRepository: IClientRepository,
    private readonly accessTokenRepository: IAccessTokenRepository,
    private readonly scopeRepository: IScopeRepository,
    private readonly privateKey: string|CryptoKey,
    private readonly encryptionKey: string,
    private readonly responseType?: ResponseType,
  ) {
  }
}