import querystring, { ParsedUrlQueryInput } from "querystring";
import { parse } from "uri-js";

import { OAuthClient } from "../../entities/client.entity";
import { OAuthException } from "../../exceptions/oauth.exception";
import { RequestInterface } from "../../requests/request";
import { AbstractGrant } from "./abstract.grant";

export abstract class AbstractAuthorizedGrant extends AbstractGrant {
  protected makeRedirectUrl(uri: string, params: ParsedUrlQueryInput, queryDelimiter = "?") {
    const split = uri.includes(queryDelimiter) ? "&" : queryDelimiter;
    return uri + split + querystring.stringify(params);
  }

  protected getRedirectUri(request: RequestInterface, client: OAuthClient): string | undefined {
    let redirectUri = this.getQueryStringParameter("redirect_uri", request);

    if (!redirectUri) {
      return;
    }

    if (Array.isArray(redirectUri) && redirectUri.length === 1) {
      redirectUri = redirectUri[0];
    }

    this.validateRedirectUri(redirectUri, client);

    return redirectUri;
  }

  private validateRedirectUri(redirectUri: any, client: OAuthClient) {
    if (typeof redirectUri !== "string" || redirectUri === "") {
      throw OAuthException.invalidRequest("redirect_uri");
    }

    const parsed = parse(redirectUri);

    if (!parsed.scheme) {
      throw OAuthException.invalidRequest("redirect_uri");
    }

    if (!!parsed.fragment) {
      throw OAuthException.invalidRequest(
        "redirect_uri",
        "Redirection endpoint must not contain url fragment based on RFC6749, section 3.1.2",
      );
    }
    
    const redirectUriWithoutQuery = redirectUri.split("?")[0];
    if (!client.redirectUris.includes(redirectUriWithoutQuery)) {
      throw OAuthException.invalidClient("Invalid redirect_uri");
    }

    return redirectUri;
  }
}
