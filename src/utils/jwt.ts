import {
  createHash,
  createPrivateKey,
  createPublicKey,
  type JsonWebKey as NodeJsonWebKey,
  type KeyObject,
} from "crypto";
import {
  decode as jwtDecode,
  sign as jwtSign,
  verify as jwtVerify,
  type Algorithm,
  type Secret,
  type SignOptions,
  type VerifyOptions,
} from "jsonwebtoken";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

export type ExtraAccessTokenFields = Record<string, string | number | boolean | (string | number | boolean)[]>;
export type ExtraAccessTokenFieldArgs = {
  user?: OAuthUser | null;
  client: OAuthClient;
  originatingAuthCodeId?: string;
};

export interface PublicJsonWebKey {
  kty: "RSA";
  n: string;
  e: string;
  use: "sig";
  alg: "RS256";
  kid: string;
}

export interface JsonWebKeySet {
  keys: PublicJsonWebKey[];
}

export interface JwtAsymmetricKeyOptions {
  key: string | Buffer | KeyObject;
  kid?: string;
  algorithm?: "RS256";
}

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

function assertRsaPublicJwk(jwk: NodeJsonWebKey): asserts jwk is NodeJsonWebKey & { kty: "RSA"; n: string; e: string } {
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

  getKeySet(): JsonWebKeySet {
    if (!this.keySet) {
      throw new Error("JWKS export requires an asymmetric signing key");
    }
    return this.keySet;
  }
}
