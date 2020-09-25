import { OAuthAccessToken, OAuthRefreshToken } from "../entities";

// @todo this is not used......
export abstract class AbstractResponse {
  protected accessToken?: OAuthAccessToken;
  protected refreshToken?: OAuthRefreshToken;
  protected privateKey?: any;
}
