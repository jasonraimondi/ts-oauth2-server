import { SignOptions, VerifyOptions } from "jsonwebtoken";

export interface JwtService {
  verify(token: string, options?: VerifyOptions): Promise<object>;

  decode(encryptedData: string): null | { [key: string]: any } | string;

  sign(payload: string | Buffer | object, options?: SignOptions): Promise<string>;
}
