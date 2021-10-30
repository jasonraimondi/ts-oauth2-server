import crypto from "crypto";

import { base64urlencode } from "../utils/base64";
import { ICodeChallenge } from "./verifier";

export class S256Verifier implements ICodeChallenge {
  public readonly method = "S256";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const codeHash = crypto.createHash("sha256").update(codeVerifier).digest();
    return codeChallenge === base64urlencode(codeHash);
  }
}
