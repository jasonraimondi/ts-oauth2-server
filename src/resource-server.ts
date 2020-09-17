import { IAccessTokenRepository } from "./repositories";

export class ResourceServer {
  constructor(
    private readonly accessTokenRepository: IAccessTokenRepository,
    private readonly publicKey: string,
    private readonly authorizationValidator: IAuthorizationValidator,
  ) {}
}