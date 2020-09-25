import crypto from "crypto";
import { base64urlencode } from "../utils";
import { ICodeChallenge } from "./verifier";

export class S256Verifier implements ICodeChallenge {
  public readonly method = "S256";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    return codeChallenge === base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));
  }
}
