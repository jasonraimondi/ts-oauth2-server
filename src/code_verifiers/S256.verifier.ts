import { createHash } from "crypto";

import { base64urlencode } from "../utils/base64.js";
import { timingSafeCompare } from "../utils/compare.js";
import { ICodeChallenge } from "./verifier.js";

/**
 * The `S256` PKCE method (RFC 7636 §4.2): the code challenge is the
 * base64url-encoded SHA-256 hash of the code verifier. The comparison is
 * constant-time.
 *
 * This is the method the server requires by default, and the only one it
 * advertises in the discovery document.
 */
export class S256Verifier implements ICodeChallenge {
  public readonly method = "S256";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const codeHash = createHash("sha256").update(codeVerifier).digest();
    return timingSafeCompare(codeChallenge, base64urlencode(codeHash));
  }
}
