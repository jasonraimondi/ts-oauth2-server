import { Prisma } from "@prisma/client";
import { ExtraAccessTokenFields, GrantIdentifier, OAuthUserRepository } from "@jmondi/oauth2-server";

import { Client } from "../entities/client";
import { User } from "../entities/user";

export class UserRepository implements OAuthUserRepository {
  constructor(private readonly repo: Prisma.UserDelegate<"rejectOnNotFound">) {}

  async getUserByCredentials(
    identifier: string,
    password?: string,
    _grantType?: GrantIdentifier,
    _client?: Client,
  ): Promise<User> {
    const user = new User(
      await this.repo.findUnique({
        rejectOnNotFound: true,
        where: { id: identifier },
      }),
    );

    // verity password and if user is allowed to use grant, etc...
    if (password) await user.verify(password);

    return user;
  }

  async extraAccessTokenFields(user: User): Promise<ExtraAccessTokenFields | undefined> {
    return { email: user.email };
  }
}
