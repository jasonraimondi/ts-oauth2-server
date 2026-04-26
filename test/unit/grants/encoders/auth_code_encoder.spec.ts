import { beforeEach, describe, expect, it } from "vitest";
import { OAuthAuthCode } from "../../../../src/entities/auth_code.entity.js";
import { OAuthClient } from "../../../../src/entities/client.entity.js";
import { OAuthException } from "../../../../src/exceptions/oauth.exception.js";
import { JwtAuthCodeEncoder, OpaqueAuthCodeEncoder } from "../../../../src/grants/encoders/auth_code_encoder.js";
import { OAuthAuthCodeRepository } from "../../../../src/repositories/auth_code.repository.js";
import { AuthorizationRequest } from "../../../../src/requests/authorization.request.js";
import { DateInterval } from "../../../../src/utils/date_interval.js";
import { JwtInterface, JwtService } from "../../../../src/utils/jwt.js";

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

const buildJwtEncoder = (jwt: JwtInterface) =>
  new JwtAuthCodeEncoder(
    payload => jwt.sign(payload),
    rawCode => jwt.verify(rawCode),
    rawCode => jwt.decode(rawCode),
  );

describe("JwtAuthCodeEncoder", () => {
  let encoder: JwtAuthCodeEncoder;
  let jwt: JwtService;

  beforeEach(() => {
    jwt = new JwtService("super-secret-test-key");
    encoder = buildJwtEncoder(jwt);
  });

  it("issues a wire-form code that round-trips through resolve()", async () => {
    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);
    request.codeChallenge = authCode.codeChallenge ?? undefined;
    request.codeChallengeMethod = authCode.codeChallengeMethod ?? undefined;
    request.audience = "test-audience";
    const expireSeconds = Math.ceil(authCode.expiresAt.getTime() / 1000);

    const wireCode = await encoder.issue(authCode, request, expireSeconds);
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
    expect(payload.expire_time).toBe(expireSeconds);
  });

  it("throws OAuthException when the wire-form code is malformed", async () => {
    await expect(encoder.resolve("not.a.real.jwt")).rejects.toBeInstanceOf(OAuthException);
  });

  it("throws OAuthException when the JWT signature is signed with a different key", async () => {
    const otherEncoder = buildJwtEncoder(new JwtService("different-key"));

    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);

    const wireCode = await otherEncoder.issue(authCode, request, Math.ceil(authCode.expiresAt.getTime() / 1000));

    await expect(encoder.resolve(wireCode)).rejects.toBeInstanceOf(OAuthException);
  });

  it("unverifiedDecode() returns auth_code_id and client_id without verifying the signature", async () => {
    const otherEncoder = buildJwtEncoder(new JwtService("different-key"));

    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);

    const wireCode = await otherEncoder.issue(authCode, request, Math.ceil(authCode.expiresAt.getTime() / 1000));

    const decoded = await encoder.unverifiedDecode(wireCode);
    expect(decoded.auth_code_id).toBe(authCode.code);
    expect(decoded.client_id).toBe(authCode.client.id);
  });

  it("unverifiedDecode() throws OAuthException for non-JWT garbage input", async () => {
    await expect(encoder.unverifiedDecode("totally-not-a-jwt-at-all")).rejects.toBeInstanceOf(OAuthException);
  });

  describe("payload validation (isAuthCodePayload)", () => {
    const buildEncoderReturning = (payload: unknown) =>
      new JwtAuthCodeEncoder(
        async () => "wire-code",
        async () => payload as Record<string, unknown>,
        () => payload as null | Record<string, any> | string,
      );

    const validBase = {
      auth_code_id: "id-1",
      client_id: "client-1",
      scopes: ["read"],
      expire_time: 1_700_000_000,
    };

    it("resolve() rejects payloads missing expire_time", async () => {
      const { expire_time, ...withoutExpire } = validBase;
      const enc = buildEncoderReturning(withoutExpire);
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads with NaN expire_time", async () => {
      const enc = buildEncoderReturning({ ...validBase, expire_time: NaN });
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads with Infinity expire_time", async () => {
      const enc = buildEncoderReturning({ ...validBase, expire_time: Infinity });
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads with non-number expire_time", async () => {
      const enc = buildEncoderReturning({ ...validBase, expire_time: "1700000000" });
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads missing client_id", async () => {
      const { client_id, ...withoutClient } = validBase;
      const enc = buildEncoderReturning(withoutClient);
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads missing auth_code_id", async () => {
      const { auth_code_id, ...withoutCode } = validBase;
      const enc = buildEncoderReturning(withoutCode);
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads with non-array scopes", async () => {
      const enc = buildEncoderReturning({ ...validBase, scopes: "read write" });
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() rejects payloads with a non-string element in scopes", async () => {
      const enc = buildEncoderReturning({ ...validBase, scopes: ["read", 42] });
      await expect(enc.resolve("any")).rejects.toBeInstanceOf(OAuthException);
    });

    it("resolve() accepts payloads with null redirect_uri (opaque-mode projection shape)", async () => {
      const enc = buildEncoderReturning({ ...validBase, redirect_uri: null });
      const { payload } = await enc.resolve("any");
      expect(payload.client_id).toBe("client-1");
    });

    it("resolve() accepts payloads with numeric user_id", async () => {
      const enc = buildEncoderReturning({ ...validBase, user_id: 42 });
      const { payload } = await enc.resolve("any");
      expect(payload.user_id).toBe(42);
    });

    it("resolve() accepts payloads with null code_challenge and code_challenge_method", async () => {
      const enc = buildEncoderReturning({
        ...validBase,
        code_challenge: null,
        code_challenge_method: null,
      });
      const { payload } = await enc.resolve("any");
      expect(payload.auth_code_id).toBe("id-1");
    });

    it("unverifiedDecode() rejects payloads missing client_id", async () => {
      const { client_id, ...withoutClient } = validBase;
      const enc = buildEncoderReturning(withoutClient);
      await expect(enc.unverifiedDecode("any")).rejects.toBeInstanceOf(OAuthException);
    });

    // RFC 7009: the revoke endpoint must silently accept a token whose
    // signature is no longer trusted. unverifiedDecode therefore stays lenient
    // about everything except the two identifiers it returns.
    it("unverifiedDecode() accepts payloads carrying only auth_code_id and client_id", async () => {
      const enc = buildEncoderReturning({ auth_code_id: "id-1", client_id: "client-1" });
      const decoded = await enc.unverifiedDecode("any");
      expect(decoded).toEqual({ auth_code_id: "id-1", client_id: "client-1" });
    });
  });

  it("dispatches issue through the supplied encryptFn", async () => {
    const calls: Array<string | Buffer | Record<string, unknown>> = [];
    const trackingEncoder = new JwtAuthCodeEncoder(
      async payload => {
        calls.push(payload);
        return "stubbed-wire-code";
      },
      rawCode => jwt.verify(rawCode),
      rawCode => jwt.decode(rawCode),
    );

    const authCode = buildAuthCode();
    const request = new AuthorizationRequest("authorization_code", authCode.client, authCode.redirectUri ?? undefined);

    const wireCode = await trackingEncoder.issue(authCode, request, Math.ceil(authCode.expiresAt.getTime() / 1000));

    expect(wireCode).toBe("stubbed-wire-code");
    expect(calls).toHaveLength(1);
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

    const wireCode = await encoder.issue(authCode, request, Math.ceil(authCode.expiresAt.getTime() / 1000));

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

  it("resolve() returns the persisted entity with no PKCE challenge", async () => {
    const authCode = buildAuthCode({ codeChallenge: undefined, codeChallengeMethod: undefined });
    await repository.persist(authCode);

    const { payload } = await encoder.resolve(authCode.code);

    expect(payload.code_challenge).toBeUndefined();
    expect(payload.code_challenge_method).toBeUndefined();
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
