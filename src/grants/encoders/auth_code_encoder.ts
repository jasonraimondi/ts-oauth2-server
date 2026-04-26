import { OAuthAuthCode } from "../../entities/auth_code.entity.js";
import { OAuthException } from "../../exceptions/oauth.exception.js";
import { OAuthAuthCodeRepository } from "../../repositories/auth_code.repository.js";
import { AuthorizationRequest } from "../../requests/authorization.request.js";
import type { PayloadAuthCode } from "../auth_code.grant.js";

interface AuthCodeEncoderResolved {
  payload: PayloadAuthCode;
  authCode: OAuthAuthCode | null;
}

export interface AuthCodeEncoder {
  /**
   * Convert an issued OAuthAuthCode into the wire-form string returned to the
   * client (either the opaque identifier or a signed JWT). `expireSeconds` is
   * the unix-epoch second the JWT-mode payload should claim as `expire_time`;
   * computed by the grant from `authCodeTTL` so it matches the value the
   * pre-refactor implementation wrote.
   */
  issue(authCode: OAuthAuthCode, request: AuthorizationRequest, expireSeconds: number): Promise<string>;

  /**
   * Resolve a wire-form auth code back to its payload and (when available) the
   * persisted entity. Throws OAuthException for malformed or missing codes.
   *
   * Performs full verification: JWT-mode encoders verify the signature; opaque
   * encoders confirm the entity exists in the repository.
   */
  resolve(rawCode: string): Promise<AuthCodeEncoderResolved>;

  /**
   * Extract the auth code identifier and client ID from a wire-form code
   * without performing signature verification. Used by the revoke endpoint,
   * which per RFC 7009 must silently accept revocation requests for tokens
   * even when the signature is no longer trusted (e.g. the signing key has
   * since rotated).
   *
   * The return shape is intentionally narrower than `resolve` — only the
   * fields the revoke handler needs to look up the persisted code.
   */
  unverifiedDecode(rawCode: string): Promise<{ auth_code_id: string; client_id: string }>;
}

type AuthCodeEncryptFn = (payload: string | Buffer | Record<string, unknown>) => Promise<string>;
type AuthCodeDecryptFn = (rawCode: string) => Promise<Record<string, unknown>>;
type AuthCodeDecodeFn = (rawCode: string) => null | Record<string, any> | string;

function isAuthCodePayload(code: unknown): code is PayloadAuthCode {
  if (typeof code !== "object" || code === null) return false;
  const p = code as Record<string, unknown>;
  return (
    typeof p.auth_code_id === "string" &&
    typeof p.client_id === "string" &&
    typeof p.expire_time === "number" &&
    Number.isFinite(p.expire_time) &&
    Array.isArray(p.scopes) &&
    p.scopes.every(scope => typeof scope === "string")
  );
}

// Per RFC 7009 the revoke endpoint silently accepts requests for tokens whose
// signature is no longer trusted, so unverifiedDecode validates only the two
// identifiers it returns — not the full PayloadAuthCode shape.
function hasAuthCodeIdentifiers(code: unknown): code is { auth_code_id: string; client_id: string } {
  if (typeof code !== "object" || code === null) return false;
  const p = code as Record<string, unknown>;
  return typeof p.auth_code_id === "string" && typeof p.client_id === "string";
}

/**
 * JWT-mode auth code encoder. Issue and resolve dispatch through the grant's
 * `encrypt` and `decrypt` hooks (supplied as callbacks) so subclass overrides
 * continue to participate. `unverifiedDecode` calls `jwt.decode` directly —
 * no override hook for unverified decoding has ever existed on the grant.
 */
export class JwtAuthCodeEncoder implements AuthCodeEncoder {
  constructor(
    private readonly encryptFn: AuthCodeEncryptFn,
    private readonly decryptFn: AuthCodeDecryptFn,
    private readonly decodeFn: AuthCodeDecodeFn,
  ) {}

  async issue(authCode: OAuthAuthCode, request: AuthorizationRequest, expireSeconds: number): Promise<string> {
    const payload: PayloadAuthCode = {
      client_id: authCode.client.id,
      redirect_uri: authCode.redirectUri,
      auth_code_id: authCode.code,
      scopes: authCode.scopes.map(scope => scope.name),
      user_id: authCode.user?.id,
      expire_time: expireSeconds,
      code_challenge: request.codeChallenge,
      code_challenge_method: request.codeChallengeMethod,
      audience: request.audience,
    };

    const jsonPayload = JSON.stringify(payload);

    return this.encryptFn(jsonPayload);
  }

  async resolve(rawCode: string): Promise<AuthCodeEncoderResolved> {
    const properties = await this.decryptFn(rawCode).catch(e => {
      throw OAuthException.badRequest(e?.message ?? "malformed jwt");
    });

    if (!isAuthCodePayload(properties)) {
      throw OAuthException.invalidParameter("code", "Malformed auth code payload");
    }

    return { payload: properties, authCode: null };
  }

  async unverifiedDecode(rawCode: string): Promise<{ auth_code_id: string; client_id: string }> {
    const parsed = this.decodeFn(rawCode);
    if (!hasAuthCodeIdentifiers(parsed)) {
      throw OAuthException.invalidParameter("code", "Malformed auth code payload");
    }
    return { auth_code_id: parsed.auth_code_id, client_id: parsed.client_id };
  }
}

export class OpaqueAuthCodeEncoder implements AuthCodeEncoder {
  constructor(private readonly authCodeRepository: OAuthAuthCodeRepository) {}

  async issue(authCode: OAuthAuthCode, _request: AuthorizationRequest, _expireSeconds: number): Promise<string> {
    return authCode.code;
  }

  async resolve(rawCode: string): Promise<AuthCodeEncoderResolved> {
    const authCode = await this.authCodeRepository.getByIdentifier(rawCode);
    if (!authCode) throw OAuthException.invalidParameter("code");

    const payload: PayloadAuthCode = {
      client_id: authCode.client.id,
      redirect_uri: authCode.redirectUri,
      auth_code_id: authCode.code,
      scopes: authCode.scopes.map(scope => scope.name),
      user_id: authCode.user?.id,
      expire_time: Math.ceil(authCode.expiresAt.getTime() / 1000),
      code_challenge: authCode.codeChallenge,
      code_challenge_method: authCode.codeChallengeMethod,
    };

    return { payload, authCode };
  }

  async unverifiedDecode(rawCode: string): Promise<{ auth_code_id: string; client_id: string }> {
    const authCode = await this.authCodeRepository.getByIdentifier(rawCode);
    if (!authCode?.client) throw OAuthException.invalidParameter("code");
    return { auth_code_id: rawCode, client_id: authCode.client.id };
  }
}
