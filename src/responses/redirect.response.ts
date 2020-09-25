import { AbstractResponse } from "./abstract.response";
import { OAuthException } from "../exceptions";
import { IResponse } from "../requests/interface";

export class RedirectResponse extends AbstractResponse {
  constructor(private readonly _redirectUri: string) {
    super();
  }

  async generateHttpResponse(response: IResponse) {
    if (!this._redirectUri) throw OAuthException.invalidRequest("redirect_uri");
    return response.redirect(302, this._redirectUri);
  }
}
