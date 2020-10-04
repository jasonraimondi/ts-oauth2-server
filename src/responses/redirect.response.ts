import { OAuthResponse, Options } from "./response";

export class RedirectResponse extends OAuthResponse {
  constructor(redirectUri: string, options?: Options) {
    super(options);
    this.set("Location", redirectUri);
    this.status = 302;
  }
}
