import { getRepository, Repository } from "typeorm";

import { ExtraAccessTokenFields, GrantIdentifier, OAuthUser, OAuthUserRepository } from "../../../../src";
import { Client } from "../entities/client";
import { User } from "../entities/user";

export class UserRepository implements OAuthUserRepository {
  constructor(private readonly userRepository: Repository<User>) {
  }
  async getUserByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: Client
  ): Promise<User> {
    const user = await this.userRepository.findOneOrFail({ id: identifier });
    // verity password and if user is allowed to use grant, etc...
    return user;
  }

  async extraAccessTokenFields(user: User): Promise<ExtraAccessTokenFields | undefined> {
    return { mail: user.email, name: `${user.firstName} ${user.lastName}` };
  }
}
