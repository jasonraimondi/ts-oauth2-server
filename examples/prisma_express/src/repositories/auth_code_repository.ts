import { Prisma } from "@prisma/client";
import { DateInterval, generateRandomToken, OAuthAuthCode, OAuthAuthCodeRepository } from "@jmondi/oauth2-server";

import { AuthCode } from "../entities/auth_code";
import { Client } from "../entities/client";
import { Scope } from "../entities/scope";
import { User } from "../entities/user";

export class AuthCodeRepository implements OAuthAuthCodeRepository {
  constructor(private readonly repo: Prisma.OAuthAuthCodeDelegate<"rejectOnNotFound">) {}

  async getByIdentifier(authCodeCode: string): Promise<AuthCode> {
    const entity = await this.repo.findUnique({
      rejectOnNotFound: true,
      where: {
        code: authCodeCode,
      },
      include: {
        client: true,
      },
    });
    return new AuthCode(entity);
  }

  async isRevoked(authCodeCode: string): Promise<boolean> {
    const authCode = await this.getByIdentifier(authCodeCode);
    return authCode.isExpired;
  }

  issueAuthCode(client: Client, user: User | undefined, scopes: Scope[]): OAuthAuthCode {
    return new AuthCode({
      redirectUri: null,
      code: generateRandomToken(),
      codeChallenge: null,
      codeChallengeMethod: "s256",
      expiresAt: new DateInterval("15m").getEndDate(),
      client,
      clientId: client.id,
      user,
      userId: user?.id ?? null,
      scopes,
    });
  }

  async persist({ user, client, scopes, ...authCode }: AuthCode): Promise<void> {
    await this.repo.create({ data: authCode });
  }

  async revoke(authCodeCode: string): Promise<void> {
    await this.repo.update({
      where: { code: authCodeCode },
      data: {
        expiresAt: new Date(0),
      },
    });
  }
}
