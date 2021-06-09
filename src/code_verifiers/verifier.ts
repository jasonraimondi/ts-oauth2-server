export type CodeChallengeMethod = "s256" | "plain";

export interface ICodeChallenge {
  method: CodeChallengeMethod;

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean;
}
