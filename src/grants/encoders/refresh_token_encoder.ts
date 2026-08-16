import { OAuthClient } from "../../entities/client.entity.js";
import { OAuthScope } from "../../entities/scope.entity.js";
import { OAuthToken } from "../../entities/token.entity.js";
import { OAuthException } from "../../exceptions/oauth.exception.js";
import { OAuthTokenRepository } from "../../repositories/access_token.repository.js";

/** The claims a {@link RefreshTokenEncoder} resolves a refresh token to. */
interface RefreshTokenResolutionPayload {
  client_id?: string;
  refresh_token_id?: string;
  expire_time?: number | null;
  [key: string]: unknown;
}

/**
 * What a {@link RefreshTokenEncoder} returns from `resolve`. `token` is the
 * persisted entity when the encoder had to read storage to resolve the token,
 * and `null` when the claims came out of a signed token instead.
 */
interface RefreshTokenResolution {
  payload: RefreshTokenResolutionPayload;
  token: OAuthToken | null;
}

/**
 * Converts a refresh token between its wire form and its claims. It is the seam
 * that isolates the grants from the choice of token format:
 * {@link JwtRefreshTokenEncoder} signs the claims into the token, and
 * {@link OpaqueRefreshTokenEncoder} returns an identifier and reads the claims
 * back from storage.
 *
 * The `useOpaqueRefreshTokens` option decides which one a grant builds.
 */
export interface RefreshTokenEncoder {
  issue(client: OAuthClient, accessToken: OAuthToken, scopes: OAuthScope[]): Promise<string>;
  resolve(rawToken: string): Promise<RefreshTokenResolution>;
}

/** Signs a refresh token. {@link JwtRefreshTokenEncoder} takes the grant's `encryptRefreshToken` as one. */
export type RefreshTokenSignFn = (
  client: OAuthClient,
  accessToken: OAuthToken,
  scopes: OAuthScope[],
) => Promise<string>;

/** Verifies a refresh token. {@link JwtRefreshTokenEncoder} takes the grant's `decrypt` as one. */
export type RefreshTokenVerifyFn = (rawToken: string) => Promise<Record<string, unknown>>;

/**
 * JWT-mode refresh token encoder. Issue and resolve are dispatched through
 * the grant's `encryptRefreshToken` and `decrypt` hooks (supplied as callbacks)
 * so subclass overrides of either method continue to participate.
 */
export class JwtRefreshTokenEncoder implements RefreshTokenEncoder {
  constructor(
    private readonly signFn: RefreshTokenSignFn,
    private readonly verifyFn: RefreshTokenVerifyFn,
  ) {}

  async issue(client: OAuthClient, accessToken: OAuthToken, scopes: OAuthScope[]): Promise<string> {
    return this.signFn(client, accessToken, scopes);
  }

  async resolve(rawToken: string): Promise<RefreshTokenResolution> {
    try {
      const payload = await this.verifyFn(rawToken);
      return { payload, token: null };
    } catch (e) {
      if (e instanceof Error && e.message === "invalid signature") {
        throw OAuthException.invalidParameter("refresh_token", "Cannot verify the refresh token");
      }
      throw OAuthException.invalidParameter("refresh_token", "Cannot decrypt the refresh token");
    }
  }
}

/**
 * Opaque-mode refresh token encoder. The wire form is the
 * {@link OAuthToken.refreshToken} identifier itself, and resolution reads the
 * persisted row back through {@link OAuthTokenRepository.getByRefreshToken},
 * which makes that row the sole record.
 */
export class OpaqueRefreshTokenEncoder implements RefreshTokenEncoder {
  constructor(private readonly tokenRepository: OAuthTokenRepository) {}

  async issue(_client: OAuthClient, accessToken: OAuthToken, _scopes: OAuthScope[]): Promise<string> {
    if (accessToken.refreshToken == null) {
      throw new Error("OpaqueRefreshTokenEncoder.issue called without a refresh token on the access token");
    }
    return accessToken.refreshToken;
  }

  async resolve(rawToken: string): Promise<RefreshTokenResolution> {
    const token = await this.tokenRepository.getByRefreshToken(rawToken);
    const expiresAtMs = token.refreshTokenExpiresAt?.getTime();
    const payload: RefreshTokenResolutionPayload = {
      refresh_token_id: token.refreshToken ?? undefined,
      client_id: token.client.id,
      expire_time: expiresAtMs != null ? Math.ceil(expiresAtMs / 1000) : null,
    };
    return { payload, token };
  }
}
