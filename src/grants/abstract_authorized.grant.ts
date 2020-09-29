import querystring, { ParsedUrlQueryInput } from "querystring";

import { AbstractGrant } from "~/grants/abstract.grant";

export abstract class AbstractAuthorizedGrant extends AbstractGrant {
  makeRedirectUrl(uri: string, params: ParsedUrlQueryInput, queryDelimiter = "?") {
    const split = uri.includes(queryDelimiter) ? queryDelimiter : "&";
    return uri + split + querystring.stringify(params);
  }
}
