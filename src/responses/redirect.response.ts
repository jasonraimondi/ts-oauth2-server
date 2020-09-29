import { OAuthResponse, Options } from "~/responses/response";

export class RedirectResponse extends OAuthResponse {
  constructor(redirectUri: string, options?: Options) {
    super(options);
    this.set("Location", redirectUri);
    this.status = 302;
  }
}
