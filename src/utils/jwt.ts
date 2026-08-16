import { createHash, createPrivateKey, createPublicKey, type KeyObject } from "crypto";
import jwt from "jsonwebtoken";
import type { Algorithm, Secret, SignOptions, VerifyOptions } from "./jwt_types.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

// jsonwebtoken is CommonJS and its named exports aren't statically detectable by
// Node's ESM loader, so a named import breaks the built ESM bundle under native
// Node. Import the default and destructure the callables we use.
const { decode: jwtDecode, sign: jwtSign, verify: jwtVerify } = jwt;

/**
 * Extra claims to add to an issued access token, returned by
 * {@link JwtInterface.extraTokenFields}. Values must be JSON scalars or arrays
 * of them.
 */
export type ExtraAccessTokenFields = Record<string, string | number | boolean | (string | number | boolean)[]>;
/** What the server passes to {@link JwtInterface.extraTokenFields} when it mints an access token. */
export type ExtraAccessTokenFieldArgs = {
  user?: OAuthUser | null;
  client: OAuthClient;
  originatingAuthCodeId?: string;
};

/** One RS256 public key, in the JWK form the JWKS endpoint publishes. */
export interface PublicJsonWebKey {
  kty: "RSA";
  n: string;
  e: string;
  use: "sig";
  alg: "RS256";
  kid: string;
}

/**
 * The key set {@link AuthorizationServer.jwks} publishes, so relying parties can
 * verify the signatures on your tokens.
 *
 * @see https://tsoauth2server.com/docs/oidc/keypair_lifecycle
 */
export interface JsonWebKeySet {
  keys: PublicJsonWebKey[];
}

/**
 * RS256 signing configuration for {@link JwtService}. OIDC requires it, because
 * a shared secret cannot be published in a JWKS.
 *
 * @example
 * ```ts
 * const jwtService = new JwtService({ key: privateKeyPem });
 * ```
 */
export interface JwtAsymmetricKeyOptions {
  key: string | Buffer | KeyObject;
  kid?: string;
  algorithm?: "RS256";
}

/**
 * The signing seam of the authorization server. Pass an implementation to the
 * {@link AuthorizationServer} constructor in place of a secret string to
 * control how tokens are signed and verified — with a KMS, for example, or a
 * different JWT library. {@link JwtService} is the built-in implementation.
 *
 * `getKeySet` is required for OIDC, which publishes the public key at the JWKS
 * endpoint. `extraTokenFields` adds your own claims to every access token.
 *
 * A custom implementation cannot weaken OIDC access-token verification:
 * {@link AccessTokenVerifier} owns the algorithm pin and the lifetime checks.
 */
export interface JwtInterface {
  verify(token: string, options?: VerifyOptions): Promise<Record<string, unknown>>;
  decode(encryptedData: string): null | Record<string, any> | string;
  sign(payload: string | Buffer | Record<string, unknown>, options?: SignOptions): Promise<string>;
  getKeySet?(): JsonWebKeySet;
  extraTokenFields?(params: ExtraAccessTokenFieldArgs): ExtraAccessTokenFields | Promise<ExtraAccessTokenFields>;
}

function isAsymmetricKeyOptions(value: Secret | JwtAsymmetricKeyOptions): value is JwtAsymmetricKeyOptions {
  return typeof value === "object" && value !== null && "key" in value;
}

/** The subset of a JWK export (`KeyObject.export({ format: "jwk" })`) we consume. */
interface ExportedJwk {
  kty?: string;
  n?: string;
  e?: string;
}

function assertRsaPublicJwk(jwk: ExportedJwk): asserts jwk is ExportedJwk & { kty: "RSA"; n: string; e: string } {
  if (jwk.kty !== "RSA" || typeof jwk.n !== "string" || typeof jwk.e !== "string") {
    throw new Error("RS256 requires an RSA key");
  }
}

function parsePrivateKey(key: string | Buffer | KeyObject): KeyObject {
  if (typeof key === "object" && "type" in key) {
    return key;
  }

  try {
    return createPrivateKey(key);
  } catch (privateKeyError) {
    let publicOnly = false;
    try {
      publicOnly = createPublicKey(key).type === "public";
    } catch {
      publicOnly = false;
    }

    if (publicOnly) {
      throw new Error("RS256 signing requires a private key");
    }

    const message = privateKeyError instanceof Error ? privateKeyError.message : String(privateKeyError);
    throw new Error(`Invalid RS256 private key: ${message}`);
  }
}

/**
 * Derives the RFC 7638 thumbprint of an RSA public key. {@link JwtService} uses
 * it as the default `kid` when you do not supply one, which keeps the key
 * identifier stable for the life of the key.
 *
 * @param jwk - The RSA public key, as `kty`, `n`, and `e`
 * @returns The base64url-encoded SHA-256 thumbprint
 */
export function calculateRsaJwkThumbprint(jwk: Pick<PublicJsonWebKey, "kty" | "n" | "e">): string {
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return createHash("sha256").update(canonical).digest("base64url");
}

/**
 * JWT service implementation for handling JSON Web Tokens.
 * Provides methods to sign, verify, and decode JWT tokens.
 */
export class JwtService implements JwtInterface {
  private readonly signingKey: Secret;
  private readonly verificationKey: Secret;
  private readonly algorithm: Algorithm;
  private readonly keySet?: JsonWebKeySet;
  private readonly keyId?: string;

  /**
   * Creates a new JWT service instance.
   *
   * @param secretOrPrivateKey - Secret key for HS256 or an RS256 private-key option object.
   */
  constructor(secretOrPrivateKey: Secret | JwtAsymmetricKeyOptions) {
    if (!isAsymmetricKeyOptions(secretOrPrivateKey)) {
      this.signingKey = secretOrPrivateKey;
      this.verificationKey = secretOrPrivateKey;
      this.algorithm = "HS256";
      return;
    }

    const algorithm = secretOrPrivateKey.algorithm ?? "RS256";
    if (algorithm !== "RS256") {
      throw new Error("Only RS256 asymmetric signing is supported");
    }

    const privateKey = parsePrivateKey(secretOrPrivateKey.key);

    if (privateKey.type !== "private") {
      throw new Error("RS256 signing requires a private key");
    }

    if (privateKey.asymmetricKeyType !== "rsa") {
      throw new Error("RS256 requires an RSA private key");
    }

    const publicKey = createPublicKey(privateKey);
    const exported = publicKey.export({ format: "jwk" });
    assertRsaPublicJwk(exported);

    const kid = secretOrPrivateKey.kid ?? calculateRsaJwkThumbprint(exported);

    this.signingKey = privateKey;
    this.verificationKey = publicKey;
    this.algorithm = algorithm;
    this.keyId = kid;
    this.keySet = {
      keys: [
        {
          kty: "RSA",
          n: exported.n,
          e: exported.e,
          use: "sig",
          alg: "RS256",
          kid,
        },
      ],
    };
  }

  /**
   * Asynchronously verify given token using a secret or public key to get a decoded token.
   * Verification always pins the algorithm configured on this service.
   */
  verify(token: string, options: VerifyOptions = {}): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      jwtVerify(token, this.verificationKey, { ...options, algorithms: [this.algorithm] }, (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        if (typeof decoded === "object" && decoded !== null) {
          resolve(decoded as Record<string, unknown>);
          return;
        }
        reject(new Error("JWT payload must be an object"));
      });
    });
  }

  /**
   * Returns the decoded payload without verifying if the signature is valid.
   */
  decode(encryptedData: string): null | { [key: string]: any } | string {
    return jwtDecode(encryptedData);
  }

  /**
   * Sign the given payload into a JSON Web Token string.
   */
  sign(payload: string | Buffer | Record<string, unknown>, options: SignOptions = {}): Promise<string> {
    const signOptions: SignOptions = { ...options, algorithm: this.algorithm };
    if (this.keyId && !signOptions.keyid && !signOptions.header?.kid) {
      signOptions.keyid = this.keyId;
    }

    return new Promise((resolve, reject) => {
      jwtSign(payload, this.signingKey, signOptions, (err, encoded) => {
        if (err) {
          reject(err);
          return;
        }
        if (encoded) {
          resolve(encoded);
          return;
        }
        reject(new Error("JWT signing failed"));
      });
    });
  }

  /**
   * Returns the public key set for the JWKS endpoint.
   *
   * @returns The key set holding this service's public key
   * @throws {Error} When the service was constructed with a shared secret
   */
  getKeySet(): JsonWebKeySet {
    if (!this.keySet) {
      throw new Error("JWKS export requires an asymmetric signing key");
    }
    return this.keySet;
  }
}
