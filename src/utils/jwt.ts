import jwt, { Secret, SignOptions, VerifyOptions } from "jsonwebtoken";

export interface JwtInterface {
  verify(token: string, clientId: string, options?: VerifyOptions): Promise<Record<string, unknown>>;
  decode(encryptedData: string): null | { [key: string]: any } | string;
  sign(payload: string | Buffer | Record<string, unknown>,  clientId: string, options?: SignOptions): Promise<string>;
}

export class JwtService implements JwtInterface {
  constructor(private readonly secretOrPrivateKey: Secret) {}

  /**
   * Asynchronously verify given token using a secret or a public key to get a decoded token
   */
  verify(token: string, _clientId: string, options: VerifyOptions = {}): Promise<Record<string, unknown>> {
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
  sign(payload: string | Buffer | Record<string, unknown>, _clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.secretOrPrivateKey, (err, encoded) => {
        if (encoded) resolve(encoded);
        else reject(err);
      });
    });
  }
}
