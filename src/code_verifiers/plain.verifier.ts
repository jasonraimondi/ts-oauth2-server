import { ICodeChallenge } from "./verifier";

export class PlainVerifier implements ICodeChallenge {
  public readonly method = "plain";

  verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    return codeChallenge === codeVerifier;
  }
}
