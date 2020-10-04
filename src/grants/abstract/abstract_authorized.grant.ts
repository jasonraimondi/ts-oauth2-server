import querystring, { ParsedUrlQueryInput } from "querystring";

import { OAuthClient } from "../../entities/client.entity";
import { OAuthException } from "../../exceptions/oauth.exception";
import { AbstractGrant } from "./abstract.grant";

export abstract class AbstractAuthorizedGrant extends AbstractGrant {
  protected makeRedirectUrl(uri: string, params: ParsedUrlQueryInput, queryDelimiter = "?") {
    const split = uri.includes(queryDelimiter) ? queryDelimiter : "&";
    return uri + split + querystring.stringify(params);
  }

  protected validateRedirectUri(redirectUri: string, client: OAuthClient) {
    if (redirectUri === "" || !client.redirectUris.includes(redirectUri)) {
      throw OAuthException.invalidClient("Invalid redirect_uri");
    }
  }
}
