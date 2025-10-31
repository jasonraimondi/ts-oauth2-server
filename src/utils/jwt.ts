import jwt, { Secret, SignOptions, VerifyOptions } from "jsonwebtoken";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

export type ExtraAccessTokenFields = Record<string, string | number | boolean | (string | number | boolean)[]>;
export type ExtraAccessTokenFieldArgs = {
  user?: OAuthUser | null;
  client: OAuthClient;
  originatingAuthCodeId?: string;
};
export interface JwtInterface {
  verify(token: string, options?: VerifyOptions): Promise<Record<string, unknown>>;
  decode(encryptedData: string): null | Record<string, any> | string;
  sign(payload: string | Buffer | Record<string, unknown>, options?: SignOptions): Promise<string>;
  extraTokenFields?(params: ExtraAccessTokenFieldArgs): ExtraAccessTokenFields | Promise<ExtraAccessTokenFields>;
}

/**
 * JWT service implementation for handling JSON Web Tokens.
 * Provides methods to sign, verify, and decode JWT tokens.
 */
export class JwtService implements JwtInterface {
  /**
   * Creates a new JWT service instance.
   *
   * @param secretOrPrivateKey - Secret key or private key for signing/verifying tokens
   */
  constructor(private readonly secretOrPrivateKey: Secret) {}

  /**
   * Asynchronously verify given token using a secret or a public key to get a decoded token
   */
  verify(token: string, options: VerifyOptions = {}): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secretOrPrivateKey, options, (err, decoded: any) => {
        if (decoded) resolve(decoded);
        else reject(err);
      });
    });
  }

  /**
   * Returns the decoded payload without verifying if the signature is valid.
   */
  decode(encryptedData: string): null | { [key: string]: any } | string {
    return jwt.decode(encryptedData);
  }

  /**
   * Sign the given payload into a JSON Web Token string
   */
  sign(payload: string | Buffer | Record<string, unknown>): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.secretOrPrivateKey, (err, encoded) => {
        if (encoded) resolve(encoded);
        else reject(err);
      });
    });
  }
}
