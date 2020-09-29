import { OAuthAccessToken } from "~/entities/access_token.entity";
import { HttpStatus } from "~/exceptions/oauth.exception";
import { OAuthResponse, Options } from "~/responses/response";

export class BearerTokenResponse extends OAuthResponse {
  readonly status = HttpStatus.OK;

  constructor(public readonly accessToken: OAuthAccessToken, options?: Options) {
    super(options);

    this.set("pragma", "no-cache");
    this.set("cache-control", "no-store");
    this.set("content-type", "application/json; charset=UTF-8");
  }
}
