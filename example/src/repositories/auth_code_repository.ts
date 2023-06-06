import { PrismaClient } from "@prisma/client";
import { DateInterval, generateRandomToken, OAuthAuthCode, OAuthAuthCodeRepository } from "@jmondi/oauth2-server";

import { AuthCode } from "../entities/auth_code.js";
import { Client } from "../entities/client.js";
import { Scope } from "../entities/scope.js";
import { User } from "../entities/user.js";

export class AuthCodeRepository implements OAuthAuthCodeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByIdentifier(authCodeCode: string): Promise<AuthCode> {
    const entity = await this.prisma.oAuthAuthCode.findUnique({
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
      codeChallengeMethod: "S256",
      expiresAt: new DateInterval("15m").getEndDate(),
      client,
      clientId: client.id,
      user,
      userId: user?.id ?? null,
      scopes,
    });
  }

  async persist({ user, client, scopes, ...authCode }: AuthCode): Promise<void> {
    await this.prisma.oAuthAuthCode.create({ data: authCode });
  }

  async revoke(authCodeCode: string): Promise<void> {
    await this.prisma.oAuthAuthCode.update({
      where: { code: authCodeCode },
      data: {
        expiresAt: new Date(0),
      },
    });
  }
}
