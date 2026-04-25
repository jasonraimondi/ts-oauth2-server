import { beforeEach, describe, expect, it } from "vitest";
import { OAuthAuthCode } from "../../../../src/entities/auth_code.entity.js";
import { OAuthClient } from "../../../../src/entities/client.entity.js";
import { OAuthException } from "../../../../src/exceptions/oauth.exception.js";
import {
  JwtAuthCodeEncoder,
  OpaqueAuthCodeEncoder,
} from "../../../../src/grants/encoders/auth_code_encoder.js";
import { OAuthAuthCodeRepository } from "../../../../src/repositories/auth_code.repository.js";
import { AuthorizationRequest } from "../../../../src/requests/authorization.request.js";
import { DateInterval } from "../../../../src/utils/date_interval.js";
import { JwtService } from "../../../../src/utils/jwt.js";

const buildClient = (): OAuthClient => ({
  id: "test-client",
  name: "Test Client",
  secret: "test-secret",
  redirectUris: ["http://example.com"],
  allowedGrants: ["authorization_code"],
  scopes: [],
});

const buildAuthCode = (overrides: Partial<OAuthAuthCode> = {}): OAuthAuthCode => ({
  code: "auth-code-id-123",
  redirectUri: "http://example.com",
  codeChallenge: "challenge-abc",
  codeChallengeMethod: "S256",
  expiresAt: new DateInterval("15m").getEndDate(),
  user: { id: "user-id-1" },
  client: buildClient(),
  scopes: [],
  ...overrides,
});

describe("JwtAuthCodeEncoder", () => {
  let encoder: JwtAuthCodeEncoder;
  let jwt: JwtService;

  beforeEach(() => {
    jwt = new JwtService("super-secret-test-key");
    encoder = new JwtAuthCodeEncoder(jwt);
  });

  it("issues a wire-form code that round-trips through resolve()", async () => {
    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);
    request.codeChallenge = authCode.codeChallenge ?? undefined;
    request.codeChallengeMethod = authCode.codeChallengeMethod ?? undefined;
    request.audience = "test-audience";

    const wireCode = await encoder.issue(authCode, request);
    expect(typeof wireCode).toBe("string");
    expect(wireCode.length).toBeGreaterThan(0);

    const { payload, authCode: resolvedAuthCode } = await encoder.resolve(wireCode);
    expect(resolvedAuthCode).toBeNull();
    expect(payload.auth_code_id).toBe(authCode.code);
    expect(payload.client_id).toBe(authCode.client.id);
    expect(payload.redirect_uri).toBe(authCode.redirectUri);
    expect(payload.code_challenge).toBe(authCode.codeChallenge);
    expect(payload.code_challenge_method).toBe(authCode.codeChallengeMethod);
    expect(payload.user_id).toBe("user-id-1");
    expect(payload.audience).toBe("test-audience");
    expect(payload.expire_time).toBe(Math.ceil(authCode.expiresAt.getTime() / 1000));
  });

  it("throws OAuthException when the wire-form code is malformed", async () => {
    await expect(encoder.resolve("not.a.real.jwt")).rejects.toBeInstanceOf(OAuthException);
  });

  it("throws OAuthException when the JWT signature is signed with a different key", async () => {
    const otherJwt = new JwtService("different-key");
    const otherEncoder = new JwtAuthCodeEncoder(otherJwt);

    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);

    const wireCode = await otherEncoder.issue(authCode, request);

    await expect(encoder.resolve(wireCode)).rejects.toBeInstanceOf(OAuthException);
  });

  it("unverifiedDecode() returns auth_code_id and client_id without verifying the signature", async () => {
    const otherJwt = new JwtService("different-key");
    const otherEncoder = new JwtAuthCodeEncoder(otherJwt);

    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);

    const wireCode = await otherEncoder.issue(authCode, request);

    const decoded = await encoder.unverifiedDecode(wireCode);
    expect(decoded.auth_code_id).toBe(authCode.code);
    expect(decoded.client_id).toBe(authCode.client.id);
  });
});

describe("OpaqueAuthCodeEncoder", () => {
  let encoder: OpaqueAuthCodeEncoder;
  let store: Record<string, OAuthAuthCode>;
  let repository: OAuthAuthCodeRepository;

  beforeEach(() => {
    store = {};
    repository = {
      issueAuthCode: () => {
        throw new Error("not implemented");
      },
      async persist(authCode: OAuthAuthCode): Promise<void> {
        store[authCode.code] = authCode;
      },
      async isRevoked(): Promise<boolean> {
        return false;
      },
      async getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode> {
        return store[authCodeCode];
      },
      async revoke(): Promise<void> {
        return;
      },
    };
    encoder = new OpaqueAuthCodeEncoder(repository);
  });

  it("issue() returns the auth code identifier verbatim", async () => {
    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);

    const wireCode = await encoder.issue(authCode, request);

    expect(wireCode).toBe(authCode.code);
  });

  it("resolve() returns the persisted entity and a payload projection", async () => {
    const authCode = buildAuthCode();
    await repository.persist(authCode);

    const { payload, authCode: resolvedAuthCode } = await encoder.resolve(authCode.code);

    expect(resolvedAuthCode).toBe(authCode);
    expect(payload.auth_code_id).toBe(authCode.code);
    expect(payload.client_id).toBe(authCode.client.id);
    expect(payload.redirect_uri).toBe(authCode.redirectUri);
    expect(payload.code_challenge).toBe(authCode.codeChallenge);
    expect(payload.code_challenge_method).toBe(authCode.codeChallengeMethod);
    expect(payload.user_id).toBe("user-id-1");
    expect(payload.expire_time).toBe(Math.ceil(authCode.expiresAt.getTime() / 1000));
  });

  it("resolve() throws OAuthException when the identifier is unknown", async () => {
    await expect(encoder.resolve("does-not-exist")).rejects.toBeInstanceOf(OAuthException);
  });

  it("unverifiedDecode() returns auth_code_id and client_id from the persisted entity", async () => {
    const authCode = buildAuthCode();
    await repository.persist(authCode);

    const decoded = await encoder.unverifiedDecode(authCode.code);
    expect(decoded.auth_code_id).toBe(authCode.code);
    expect(decoded.client_id).toBe(authCode.client.id);
  });

  it("unverifiedDecode() throws OAuthException when the identifier is unknown", async () => {
    await expect(encoder.unverifiedDecode("does-not-exist")).rejects.toBeInstanceOf(OAuthException);
  });
});
