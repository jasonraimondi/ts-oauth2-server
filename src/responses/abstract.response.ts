import { OAuthAccessToken, OAuthRefreshToken } from "../entities";

export abstract class AbstractResponse {
  // @todo this is not used......
  protected accessToken?: OAuthAccessToken;
  // @todo this is not used......
  protected refreshToken?: OAuthRefreshToken;
  protected privateKey?: any;
}
