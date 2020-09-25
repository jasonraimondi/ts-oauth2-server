export type CodeChallengeMethod = "S256" | "plain";

export interface ICodeChallenge {
  method: CodeChallengeMethod;

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean;
}
