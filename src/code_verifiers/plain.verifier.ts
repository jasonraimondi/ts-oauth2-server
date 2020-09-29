import { ICodeChallenge } from "~/code_verifiers/verifier";

export class PlainVerifier implements ICodeChallenge {
  public readonly method = "plain";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    console.log({
      type: "verifyCodeChallenge plain",
      codeVerifier,
      codeChallenge,
    });
    return codeChallenge === codeVerifier;
  }
}
