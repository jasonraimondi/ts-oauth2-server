/**
 * How a PKCE code challenge is derived from the code verifier (RFC 7636 §4.2).
 * `S256` is the SHA-256 form and the only method allowed while `requiresS256`
 * is enabled, which is the default.
 */
export type CodeChallengeMethod = "S256" | "plain";

/** Verifies a PKCE code verifier against the code challenge stored with an authorization code. */
export interface ICodeChallenge {
  /** The challenge method this verifier implements. */
  method: CodeChallengeMethod;

  /**
   * Reports whether the verifier produces the challenge.
   *
   * @param codeVerifier - The `code_verifier` from the token request
   * @param codeChallenge - The `code_challenge` from the authorization request
   * @returns `true` when the two match
   */
  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean;
}
