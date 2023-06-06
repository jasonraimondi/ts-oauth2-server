import { GrantIdentifier, OAuthUserRepository } from "@jmondi/oauth2-server";
import { PrismaClient } from "@prisma/client";

import { Client } from "../entities/client.js";
import { User } from "../entities/user.js";

export class UserRepository implements OAuthUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getUserByCredentials(
    identifier: string,
    password?: string,
    _grantType?: GrantIdentifier,
    _client?: Client,
  ): Promise<User> {
    const user = new User(
      await this.prisma.user.findUnique({
        rejectOnNotFound: true,
        where: { id: identifier },
      }),
    );

    // verity password and if user is allowed to use grant, etc...
    if (password) await user.verify(password);

    return user;
  }
}
