import { getRepository } from "typeorm";
import { OAuthAuthCode, OAuthAuthCodeRepository, OAuthClient, OAuthScope, OAuthUser } from "../../../src";
import OAuthAuthCodeImp from "../entities/oauthAuthCode";
import OAuthAuthCodeFactory from "../factories/oauthAuthCodeFactory";

export const authCodeRepository: OAuthAuthCodeRepository = {
  // Fetch auth code entity from storage by code
  async getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode> {
    const authCodeRepo = getRepository(OAuthAuthCodeImp, process.env.NODE_ENV);
    const authCode = await authCodeRepo.findOne({ code: authCodeCode }, { relations: ["client", "scopes", "user"] });
    return authCode as OAuthAuthCode;
  },
  // An async call that should return an OAuthAuthCode that has not been
  // persisted to storage yet.
  issueAuthCode(client: OAuthClient, user: OAuthUser | undefined, scopes: OAuthScope[]): OAuthAuthCode {
    const dt = new Date();
    dt.setHours(dt.getHours() + 2);
    return {
      code: "fresh-code",
      user,
      client,
      redirectUri: client.redirectUris[0],
      codeChallenge: undefined,
      codeChallengeMethod: undefined,
      expiresAt: dt,
      scopes: scopes,
    };
  },
  // An async call that should persist an OAuthToken into your storage.
  async persist(authCode: OAuthAuthCode): Promise<void> {
    const authCodeRepo = getRepository(OAuthAuthCodeImp, process.env.NODE_ENV);
    const newAuthCode = OAuthAuthCodeFactory.from(authCode);
    await authCodeRepo.save(newAuthCode);
    return;
  },
  // This async method is called when an auth code is validated by the
  // authorization server. Return `true` if the auth code has been
  // manually revoked. If the code is still valid return `false`
  async isRevoked(authCodeCode: string): Promise<boolean> {
    const authCodeRepo = getRepository(OAuthAuthCodeImp, process.env.NODE_ENV);
    const authCode = await authCodeRepo.findOne({ code: authCodeCode });
    if (authCode) return Date.now() > authCode.expiresAt.getTime();
    return true;
  },
  // Revoke or delete from storage
  async revoke(authCodeCode: string): Promise<void> {
    const authCodeRepo = getRepository(OAuthAuthCodeImp, process.env.NODE_ENV);
    await authCodeRepo.delete({ code: authCodeCode });
    return;
  },
};
