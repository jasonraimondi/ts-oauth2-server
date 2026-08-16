import { timingSafeCompare } from "../utils/compare.js";
import { ICodeChallenge } from "./verifier.js";

/**
 * The `plain` PKCE method (RFC 7636 §4.2), where the code challenge is the code
 * verifier itself. The comparison is constant-time.
 *
 * The method is weaker than {@link S256Verifier} — a challenge intercepted on
 * the authorization request is the verifier — so the server rejects it while
 * `requiresS256` is enabled, which is the default.
 */
export class PlainVerifier implements ICodeChallenge {
  public readonly method = "plain";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    return timingSafeCompare(codeChallenge, codeVerifier);
  }
}
