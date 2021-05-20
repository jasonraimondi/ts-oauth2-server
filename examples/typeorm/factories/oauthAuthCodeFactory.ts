import { OAuthAuthCode } from "../../../src";
import OAuthAuthCodeImp from "../entities/oauthAuthCode";
import OAuthScopeImp from "../entities/oauthScope";

export default class OAuthAuthCodeFactory {
  static from(code: OAuthAuthCode): OAuthAuthCodeImp {
    const newCode = new OAuthAuthCodeImp();
    newCode.clientId = code.client.id;
    newCode.userId = code.user?.id;
    newCode.code = code.code;
    newCode.codeChallenge = code.codeChallenge;
    newCode.codeChallengeMethod = code.codeChallengeMethod;
    newCode.expiresAt = code.expiresAt;
    newCode.redirectUri = code.redirectUri;
    newCode.scopes = code.scopes as OAuthScopeImp[];
    return newCode;
  }
}
