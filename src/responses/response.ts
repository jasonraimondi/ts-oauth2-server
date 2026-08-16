/** HTTP headers, keyed by lower-case name. */
export interface Headers {
  /** The redirect target. Set on the 302 responses the authorize endpoint returns. */
  location?: string;

  [key: string]: any;
}

/** Constructor options for {@link OAuthRequest} and {@link OAuthResponse}. */
export interface Options {
  headers?: Headers;
  body?: { [key: string]: any };
  query?: { [key: string]: any };
  status?: number;
  [key: string]: any;
}

/**
 * The response shape every {@link AuthorizationServer} endpoint returns. Your
 * adapter reads `status`, `headers`, and `body` from it and writes them to the
 * framework response. A status of 302 means a redirect, and the target is in
 * the `location` header.
 */
export interface ResponseInterface {
  /** The HTTP status code. */
  status: number;

  /** Response headers, keyed by lower-case name. */
  headers: { [key: string]: any };

  /** The response body, serialized as JSON. Empty on a redirect. */
  body: { [key: string]: any };

  get(field: string): string;

  set(field: string, value: string): void;
}

/**
 * The library's own {@link ResponseInterface} implementation. The endpoints
 * return one of these, and the adapters convert it to a framework response.
 */
export class OAuthResponse implements ResponseInterface {
  status: number;
  body: Record<string, unknown>;
  headers: Headers;

  constructor(responseOptions: Options = { headers: {} }) {
    this.headers = responseOptions.headers ?? {};
    this.body = responseOptions.body ?? {};
    this.status = responseOptions.status ?? 200;
  }

  /**
   * Reads a header. The name is lower-cased first.
   *
   * @param field - Header name
   * @returns The header value, or `undefined` when the header is not set
   */
  get(field: string): any {
    return this.headers[field.toLowerCase()];
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
