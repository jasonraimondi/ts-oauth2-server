import { OAuthClient } from "../../entities/client.entity.js";
import { OAuthException } from "../../exceptions/oauth.exception.js";
import { RequestInterface } from "../../requests/request.js";
import { AbstractGrant } from "./abstract.grant.js";
import { tryParseUrl, redirectUriMatches } from "../../utils/urls.js";

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
    const search = new URLSearchParams(params as ConstructorParameters<typeof URLSearchParams>[0]);
    const split = uri.includes(queryDelimiter) ? "&" : queryDelimiter;
    return uri + split + search.toString();
  }

  protected getRedirectUri(request: RequestInterface, client: OAuthClient): string | undefined {
    let redirectUri = this.getQueryStringParameter("redirect_uri", request);

    if (!redirectUri) {
      if (client.redirectUris.length !== 1) {
        throw OAuthException.invalidParameter(
          "redirect_uri",
          "The request must include a redirect_uri when zero or multiple redirect uris are registered",
        );
      }
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

    if (!tryParseUrl(redirectUri)) {
      throw OAuthException.invalidParameter("redirect_uri");
    }

    // Check the raw string: URL.hash is "" for both a missing fragment and an
    // empty one (bare trailing "#"), and WHATWG parsing strips tab/newline, so
    // fragments like "#\t" are invisible after parsing.
    if (redirectUri.includes("#")) {
      throw OAuthException.invalidParameter(
        "redirect_uri",
        "Redirection endpoint must not contain url fragment based on RFC6749, section 3.1.2",
      );
    }

    if (!client.redirectUris.some(uri => redirectUriMatches(redirectUri, uri, this.options))) {
      throw OAuthException.invalidClient("Invalid redirect_uri");
    }

    return redirectUri;
  }
}
