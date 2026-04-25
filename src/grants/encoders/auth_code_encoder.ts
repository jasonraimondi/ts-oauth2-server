import { OAuthAuthCode } from "../../entities/auth_code.entity.js";
import { OAuthException } from "../../exceptions/oauth.exception.js";
import { OAuthAuthCodeRepository } from "../../repositories/auth_code.repository.js";
import { AuthorizationRequest } from "../../requests/authorization.request.js";
import { JwtInterface } from "../../utils/jwt.js";
import type { PayloadAuthCode } from "../auth_code.grant.js";

export interface AuthCodeEncoderResolved {
  payload: PayloadAuthCode;
  authCode: OAuthAuthCode | null;
}

export interface AuthCodeEncoder {
  /**
   * Convert an issued OAuthAuthCode into the wire-form string returned to the
   * client (either the opaque identifier or a signed JWT).
   */
  issue(authCode: OAuthAuthCode, request: AuthorizationRequest): Promise<string>;

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
   * For opaque codes this is identical to `resolve`. For JWTs the signature
   * is intentionally not checked.
   */
  unverifiedDecode(rawCode: string): Promise<{ auth_code_id: string; client_id: string }>;
}

function isAuthCodePayload(code: unknown): code is PayloadAuthCode {
  return typeof code === "object" && code !== null && "auth_code_id" in code;
}

export class JwtAuthCodeEncoder implements AuthCodeEncoder {
  constructor(private readonly jwt: JwtInterface) {}

  async issue(authCode: OAuthAuthCode, request: AuthorizationRequest): Promise<string> {
    const payload: PayloadAuthCode = {
      client_id: authCode.client.id,
      redirect_uri: authCode.redirectUri,
      auth_code_id: authCode.code,
      scopes: authCode.scopes.map(scope => scope.name),
      user_id: authCode.user?.id,
      expire_time: Math.ceil(authCode.expiresAt.getTime() / 1000),
      code_challenge: request.codeChallenge,
      code_challenge_method: request.codeChallengeMethod,
      audience: request.audience,
    };

    const jsonPayload = JSON.stringify(payload);

    return this.jwt.sign(jsonPayload);
  }

  async resolve(rawCode: string): Promise<AuthCodeEncoderResolved> {
    const properties = await this.jwt.verify(rawCode).catch(e => {
      throw OAuthException.badRequest(e?.message ?? "malformed jwt");
    });

    if (!isAuthCodePayload(properties)) {
      throw OAuthException.invalidParameter("code", "Malformed auth code payload");
    }

    return { payload: properties, authCode: null };
  }

  async unverifiedDecode(rawCode: string): Promise<{ auth_code_id: string; client_id: string }> {
    const parsed = this.jwt.decode(rawCode);
    if (!isAuthCodePayload(parsed)) {
      throw new Error("Malformed auth code payload");
    }
    return { auth_code_id: parsed.auth_code_id, client_id: parsed.client_id };
  }
}

export class OpaqueAuthCodeEncoder implements AuthCodeEncoder {
  constructor(private readonly authCodeRepository: OAuthAuthCodeRepository) {}

  async issue(authCode: OAuthAuthCode, _request: AuthorizationRequest): Promise<string> {
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
