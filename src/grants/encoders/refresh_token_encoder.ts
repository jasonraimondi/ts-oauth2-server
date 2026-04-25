import { OAuthClient } from "../../entities/client.entity.js";
import { OAuthScope } from "../../entities/scope.entity.js";
import { OAuthToken } from "../../entities/token.entity.js";
import { OAuthException } from "../../exceptions/oauth.exception.js";
import { OAuthTokenRepository } from "../../repositories/access_token.repository.js";
import { JwtInterface } from "../../utils/jwt.js";

export interface RefreshTokenResolution {
  payload: any;
  token: OAuthToken | null;
}

export interface RefreshTokenEncoder {
  issue(client: OAuthClient, accessToken: OAuthToken, scopes: OAuthScope[]): Promise<string>;
  resolve(rawToken: string): Promise<RefreshTokenResolution>;
}

export class JwtRefreshTokenEncoder implements RefreshTokenEncoder {
  constructor(
    private readonly jwt: JwtInterface,
    private readonly scopeDelimiter: string,
  ) {}

  async issue(client: OAuthClient, accessToken: OAuthToken, scopes: OAuthScope[]): Promise<string> {
    const expiresAtMs = accessToken.refreshTokenExpiresAt?.getTime() ?? accessToken.accessTokenExpiresAt.getTime();
    return this.jwt.sign({
      client_id: client.id,
      access_token_id: accessToken.accessToken,
      refresh_token_id: accessToken.refreshToken,
      scope: scopes.map(scope => scope.name).join(this.scopeDelimiter),
      user_id: accessToken.user?.id,
      expire_time: Math.ceil(expiresAtMs / 1000),
    });
  }

  async resolve(rawToken: string): Promise<RefreshTokenResolution> {
    try {
      const payload = await this.jwt.verify(rawToken);
      return { payload, token: null };
    } catch (e) {
      if (e instanceof Error && e.message === "invalid signature") {
        throw OAuthException.invalidParameter("refresh_token", "Cannot verify the refresh token");
      }
      throw OAuthException.invalidParameter("refresh_token", "Cannot decrypt the refresh token");
    }
  }
}

export class OpaqueRefreshTokenEncoder implements RefreshTokenEncoder {
  constructor(private readonly tokenRepository: OAuthTokenRepository) {}

  async issue(_client: OAuthClient, accessToken: OAuthToken, _scopes: OAuthScope[]): Promise<string> {
    return accessToken.refreshToken as string;
  }

  async resolve(rawToken: string): Promise<RefreshTokenResolution> {
    const token = await this.tokenRepository.getByRefreshToken(rawToken);
    const expiresAtMs = token.refreshTokenExpiresAt?.getTime();
    const payload = {
      refresh_token_id: token.refreshToken,
      client_id: token.client.id,
      expire_time: expiresAtMs != null ? Math.ceil(expiresAtMs / 1000) : null,
    };
    return { payload, token };
  }
}
