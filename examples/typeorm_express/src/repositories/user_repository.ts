import { GrantIdentifier, OAuthUserRepository } from "@jmondi/oauth2-server";
import { Repository } from "typeorm";

import { Client } from "../entities/client";
import { User } from "../entities/user";

export class UserRepository implements OAuthUserRepository {
  constructor(private readonly userRepository: Repository<User>) {}
  async getUserByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: Client,
  ): Promise<User> {
    const user = await this.userRepository.findOneOrFail({ id: identifier });
    // verity password and if user is allowed to use grant, etc...
    return user;
  }
}
