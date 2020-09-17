import { IAuthCodeRepository, IRefreshTokenRepository } from "../repositories";
import { pattern } from "iso8601-duration";

export class AuthCodeGrant {
  private readonly refreshTokenTTL = "P1M";
  constructor(
    private readonly authCodeRepository: IAuthCodeRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly authCodeTTL: string,
  ) {
    if (!pattern.test(authCodeTTL)) throw new Error(`Invalid authCodeTTL, must match ${pattern}`)
  }
}
