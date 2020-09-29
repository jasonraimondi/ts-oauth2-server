import jwt, { Secret, SignOptions, VerifyOptions } from "jsonwebtoken";

export interface JwtService {
  verify(token: string, options?: VerifyOptions): Promise<object>;
  decode(encryptedData: string): null | { [key: string]: any } | string;
  sign(payload: string | Buffer | object, options?: SignOptions): Promise<string>;
}

export class JWT implements JwtService {
  constructor(private readonly secretOrPrivateKey: Secret) {}

  /**
   * Asynchronously verify given token using a secret or a public key to get a decoded token
   */
  verify(token: string, options: VerifyOptions = {}): Promise<object> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secretOrPrivateKey, options, (err, decoded) => {
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
  sign(payload: string | Buffer | object): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.secretOrPrivateKey, (err, encoded) => {
        if (encoded) resolve(encoded);
        else reject(err);
      });
    });
  }
}
