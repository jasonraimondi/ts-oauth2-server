import { OAuthToken } from "../entities/token.entity";
import { HttpStatus } from "../exceptions/oauth.exception";
import { OAuthResponse, Options } from "./response";

export class BearerTokenResponse extends OAuthResponse {
  readonly status = HttpStatus.OK;

  constructor(public readonly accessToken: OAuthToken, options?: Options) {
    super(options);

    this.set("pragma", "no-cache");
    this.set("cache-control", "no-store");
    this.set("content-type", "application/json; charset=UTF-8");
  }
}
