import { User as UserModel } from "@prisma/client";
import bcrypt from "bcryptjs";
import { OAuthUser } from "@jmondi/oauth2-server";

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
    this.passwordHash = await bcrypt.hash(password, 12);
  }

  async verify(password: string) {
    if (!(await bcrypt.compare(password, this.passwordHash))) {
      throw new Error("invalid password");
    }
  }
}
