import { PrismaClient } from "@prisma/client";
import { DateInterval, generateRandomToken, OAuthClient, OAuthTokenRepository } from "../../../src";

import { Client } from "../entities/client.js";
import { Scope } from "../entities/scope.js";
import { Token } from "../entities/token.js";
import { User } from "../entities/user.js";

export class TokenRepository implements OAuthTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(accessToken: string): Promise<Token> {
    const token = await this.prisma.oAuthToken.findUnique({
      rejectOnNotFound: true,
      where: {
        accessToken,
      },
      include: {
        user: true,
        client: true,
        scopes: true,
      },
    });
    return new Token(token);
  }

  async issueToken(client: Client, scopes: Scope[], user?: User): Promise<Token> {
    return new Token({
      accessToken: generateRandomToken(),
      accessTokenExpiresAt: new DateInterval("2h").getEndDate(),
      refreshToken: null,
      refreshTokenExpiresAt: null,
      client,
      clientId: client.id,
      user: user,
      userId: user?.id ?? null,
      scopes,
    });
  }

  async getByRefreshToken(refreshToken: string): Promise<Token> {
    const token = await this.prisma.oAuthToken.findUnique({
      rejectOnNotFound: true,
      where: { refreshToken },
      include: {
        client: true,
        scopes: true,
        user: true,
      },
    });
    return new Token(token);
  }

  async isRefreshTokenRevoked(token: Token): Promise<boolean> {
    return Date.now() > (token.refreshTokenExpiresAt?.getTime() ?? 0);
  }

  async issueRefreshToken(token: Token, _: OAuthClient): Promise<Token> {
    token.refreshToken = generateRandomToken();
    token.refreshTokenExpiresAt = new DateInterval("2h").getEndDate();
    await this.prisma.oAuthToken.update({
      where: {
        accessToken: token.accessToken,
      },
      data: {
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      },
    });
    return token;
  }

  async persist({ user, client, scopes, ...token }: Token): Promise<void> {
    await this.prisma.oAuthToken.upsert({
      where: {
        accessToken: token.accessToken,
      },
      update: {},
      create: token,
    });
  }

  async revoke(accessToken: Token): Promise<void> {
    accessToken.revoke();
    await this.update(accessToken);
  }

  private async update({ user, client, scopes, ...token }: Token): Promise<void> {
    await this.prisma.oAuthToken.update({
      where: {
        accessToken: token.accessToken,
      },
      data: token,
    });
  }
}
