import { User as UserModel } from "@prisma/client";
import { compare, hash } from "bcryptjs";

import { OAuthUser } from "../../../../src";

export class User implements UserModel, OAuthUser {
  readonly id: string;
  email: string;
  passwordHash: string;

  constructor(entity: UserModel) {
    this.id = entity.id;
    this.email = entity.email;
    this.passwordHash = entity.passwordHash;
  }

  async setPassword(password: string) {
    this.passwordHash = await hash(password, 12);
  }

  async verify(password: string) {
    if (!(await compare(password, this.passwordHash))) {
      throw new Error("invalid password");
    }
  }
}
