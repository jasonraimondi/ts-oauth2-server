import { getRepository } from "typeorm";
import { ExtraAccessTokenFields, OAuthUser, OAuthUserRepository } from "../../../src";
import OAuthUserImp from "../entities/oauthUser";

export const userRepository: OAuthUserRepository = {
  // Fetch user entity from storage by identifier. A provided password may
  // be used to validate the users credentials. Grant type and client are provided
  // for additional checks if desired
  async getUserByCredentials(
    identifier: string,
    // password?: string,
    // grantType?: GrantIdentifier,
    // client?: OAuthClient
  ): Promise<OAuthUser | undefined> {
    const userRepository = getRepository(OAuthUserImp, process.env.NODE_ENV);
    const user = await userRepository.findOne({ id: identifier });
    return (user as unknown) as OAuthUser;
  },
  async extraAccessTokenFields(user: OAuthUser): Promise<ExtraAccessTokenFields | undefined> {
    if (user instanceof OAuthUserImp) return { mail: user.mail, name: `${user.firstName} ${user.lastName}` };
    return undefined;
  },
};
