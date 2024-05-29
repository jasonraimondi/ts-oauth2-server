import { parse } from "uri-js";

import { OAuthClient } from "../../entities/client.entity.js";
import { OAuthException } from "../../exceptions/oauth.exception.js";
import { RequestInterface } from "../../requests/request.js";
import { AbstractGrant } from "./abstract.grant.js";
import { urlsAreSameIgnoringPort } from "../../utils/urls.js";

export abstract class AbstractAuthorizedGrant extends AbstractGrant {
  protected makeRedirectUrl(
    uri: string,
    params:
      | URLSearchParams
      | string
      | Record<string, string | ReadonlyArray<string>>
      | Iterable<[string, string]>
      | ReadonlyArray<[string, string]>,
    queryDelimiter = "?",
  ): string {
    params = new URLSearchParams(params);
    const split = uri.includes(queryDelimiter) ? "&" : queryDelimiter;
    return uri + split + params.toString();
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
      throw OAuthException.invalidParameter("redirect_uri");
    }

    const parsed = parse(redirectUri);

    if (!parsed.scheme) {
      throw OAuthException.invalidParameter("redirect_uri");
    }

    if (!!parsed.fragment) {
      throw OAuthException.invalidParameter(
        "redirect_uri",
        "Redirection endpoint must not contain url fragment based on RFC6749, section 3.1.2",
      );
    }

    if (!client.redirectUris.some(uri => urlsAreSameIgnoringPort(redirectUri, uri))) {
      throw OAuthException.invalidClient("Invalid redirect_uri");
    }

    return redirectUri;
  }
}
