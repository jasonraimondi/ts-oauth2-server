import { OAuthResponse, Options } from "./response.js";

/**
 * A 302 response carrying a `Location` header. The authorize endpoint returns
 * one to send the end-user back to the client, with the authorization code — or,
 * for the implicit grant, the access token — appended to the redirect URI.
 */
export class RedirectResponse extends OAuthResponse {
  /**
   * @param redirectUri - The URL to redirect to, parameters included
   * @param options - Any further response options
   */
  constructor(redirectUri: string, options?: Options) {
    super(options);
    this.set("Location", redirectUri);
    this.status = 302;
  }
}
