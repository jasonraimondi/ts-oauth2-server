import { parse } from "uri-js";

import { OAuthClient } from "../../entities/client.entity";
import { OAuthException } from "../../exceptions/oauth.exception";
import { RequestInterface } from "../../requests/request";
import { AbstractGrant } from "./abstract.grant";

export abstract class AbstractAuthorizedGrant extends AbstractGrant {
  protected makeRedirectUrl(
    uri: string,
    params: URLSearchParams | string | Record<string, string | ReadonlyArray<string>> | Iterable<[string, string]> | ReadonlyArray<[string, string]>,
    queryDelimiter = "?",
  ) {
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

    const redirectUriWithoutQuery = redirectUri.split("?")[0];
    if (!client.redirectUris.includes(redirectUriWithoutQuery)) {
      throw OAuthException.invalidClient("Invalid redirect_uri");
    }

    return redirectUri;
  }
}
