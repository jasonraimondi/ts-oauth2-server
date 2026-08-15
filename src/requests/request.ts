import { Headers, Options } from "../responses/response.js";

/**
 * The request shape every {@link AuthorizationServer} endpoint accepts. It is
 * the whole framework contract: an object with `headers`, `query`, and `body`
 * satisfies it, so an Express request can be passed straight through, and any
 * other framework needs only an adapter that maps those three fields.
 */
export interface RequestInterface {
  /** Request headers, keyed by lower-case name. */
  headers: { [key: string]: any };

  /** Parsed query string parameters. */
  query: { [key: string]: any };

  /** Parsed request body. */
  body: { [key: string]: any };
}

/**
 * The library's own {@link RequestInterface} implementation. The adapters build
 * one of these from a framework request.
 *
 * @example
 * ```ts
 * import { OAuthRequest } from "@jmondi/oauth2-server";
 *
 * const request = new OAuthRequest({ body: { grant_type: "client_credentials" } });
 * ```
 */
export class OAuthRequest implements RequestInterface {
  body: { [key: string]: any };
  headers: Headers = {};
  query: { [key: string]: any };

  constructor(options: Options = {}) {
    this.headers = {
      ...options.headers,
    };
    this.query = {
      ...options.query,
    };
    this.body = {
      ...options.body,
    };
  }

  /**
   * Sets a header. The name is lower-cased first.
   *
   * @param fieldOrHeaders - Header name
   * @param value - Header value
   */
  set(fieldOrHeaders: string, value: any): void {
    this.headers[fieldOrHeaders.toLowerCase()] = value;
  }
}
