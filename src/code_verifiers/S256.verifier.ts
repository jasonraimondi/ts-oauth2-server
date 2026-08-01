import { createHash } from "crypto";

import { base64urlencode } from "../utils/base64.js";
import { timingSafeCompare } from "../utils/compare.js";
import { ICodeChallenge } from "./verifier.js";

export class S256Verifier implements ICodeChallenge {
  public readonly method = "S256";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const codeHash = createHash("sha256").update(codeVerifier).digest();
    return timingSafeCompare(codeChallenge, base64urlencode(codeHash));
  }
}
