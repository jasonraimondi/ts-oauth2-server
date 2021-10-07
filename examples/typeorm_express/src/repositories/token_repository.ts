import { Repository } from "typeorm";
import { DateInterval, generateRandomToken, OAuthTokenRepository } from "@jmondi/oauth2-server";

import { Client } from "../entities/client";
import { Scope } from "../entities/scope";
import { Token } from "../entities/token";
import { User } from "../entities/user";

export class TokenRepository implements OAuthTokenRepository {
  constructor(private readonly tokenRepo: Repository<Token>) {}

  async findById(id: string): Promise<Token> {
    return this.tokenRepo.findOneOrFail(id, {
      join: {
        alias: "token",
        leftJoinAndSelect: {
          user: "token.user",
        },
      },
    });
  }

  async issueToken(client: Client, scopes: Scope[], user?: User): Promise<Token> {
    const token = new Token();
    token.accessToken = generateRandomToken();
    token.accessTokenExpiresAt = new DateInterval("2h").getEndDate();
    token.client = client;
    token.clientId = client.id;
    token.user = user;
    token.userId = user?.id;
    token.scopes = [];
    scopes.forEach(scope => token.scopes.push(scope));
    return token;
  }

  async getByRefreshToken(refreshTokenToken: string): Promise<Token> {
    return this.tokenRepo.findOneOrFail(
      { refreshToken: refreshTokenToken },
      { relations: ["client", "scopes", "user"] },
    );
  }

  async isRefreshTokenRevoked(token: Token): Promise<boolean> {
    return Date.now() > (token.refreshTokenExpiresAt?.getTime() ?? 0);
  }

  async issueRefreshToken(accessToken: Token): Promise<Token> {
    accessToken.refreshToken = generateRandomToken();
    accessToken.refreshTokenExpiresAt = new DateInterval("2h").getEndDate();
    return await this.tokenRepo.save(accessToken);
  }

  async persist(accessToken: Token): Promise<void> {
    await this.tokenRepo.save(accessToken);
  }

  async revoke(accessToken: Token): Promise<void> {
    accessToken.revoke();
    await this.tokenRepo.save(accessToken);
  }
}
