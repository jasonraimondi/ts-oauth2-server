import { OAuthToken } from "../entities/token.entity.js";
import { HttpStatus } from "../exceptions/oauth.exception.js";
import { OAuthResponse, Options } from "./response.js";

/**
 * A 200 token response (RFC 6749 §5.1). It sets the no-store cache headers the
 * spec requires, so a token is never cached by an intermediary, and keeps a
 * reference to the {@link OAuthToken} the body was built from.
 */
export class BearerTokenResponse extends OAuthResponse {
  /**
   * @param accessToken - The token entity this response reports
   * @param options - Any further response options
   */
  readonly status = HttpStatus.OK;

  constructor(
    public readonly accessToken: OAuthToken,
    options?: Options,
  ) {
    super(options);

    this.set("pragma", "no-cache");
    this.set("cache-control", "no-store");
    this.set("content-type", "application/json; charset=UTF-8");
  }
}
