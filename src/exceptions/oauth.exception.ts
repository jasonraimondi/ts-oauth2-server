export const HttpStatus = {
  NOT_ACCEPTABLE: 406,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
  OK: 200,
};

export enum ErrorType {
  InvalidRequest = "invalid_request",
  InvalidClient = "invalid_client",
  InvalidGrant = "invalid_grant",
  InvalidScope = "invalid_scope",
  UnauthorizedClient = "unauthorized_client",
  UnsupportedGrantType = "unsupported_grant_type",
  AccessDenied = "access_denied",
}

export class OAuthException extends Error {
  constructor(
    public readonly error: string,
    public readonly errorType: ErrorType,
    public readonly errorDescription?: string,
    public readonly errorUri?: string,
    public readonly status = HttpStatus.BAD_REQUEST,
  ) {
    super(errorDescription ? `${error}: ${errorDescription}` : error);

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }

  /**
   * The request is missing a parameter so the server can’t proceed with the request. This
   * may also be returned if the request includes an unsupported parameter or repeats a
   * parameter.
   */
  static invalidParameter(parameter: string, errorDescription?: string): OAuthException {
    let message = "The request is missing a required parameter, includes an invalid parameter value, ";
    message += "includes a parameter more than once, or is otherwise malformed";
    errorDescription = errorDescription ? errorDescription : `Check the \`${parameter}\` parameter`;
    return new OAuthException(message, ErrorType.InvalidRequest, errorDescription);
  }

  /**
   * Client authentication failed, such as if the request contains an invalid client ID or
   * secret. Send an HTTP 401 response in this case.
   */
  static invalidClient(errorDescription?: string) {
    return new OAuthException(
      "Client authentication failed",
      ErrorType.InvalidClient,
      errorDescription,
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }

  /**
   * The authorization code (or user’s password for the password grant type) is invalid or
   * expired. This is also the error you would return if the redirect URL given in the
   * authorization grant does not match the URL provided in this access token request.
   */
  static invalidGrant(errorDescription?: string) {
    let message = "The provided authorization grant (e.g., authorization_code, client_credentials) or refresh token ";
    message += "is invalid, expired, revoked, or does not match the redirection URI used in the authorization ";
    message += "request, or was issued to another client";
    return new OAuthException(message, ErrorType.InvalidGrant, errorDescription);
  }

  /**
   * For access token requests that include a scope (password or client_credentials grants),
   * this error indicates an invalid scope value in the request.
   */
  static invalidScope(scope?: string, redirectUri?: string) {
    const message = "The requested scope is invalid, unknown, or malformed";
    let hint = "Specify a scope in the request or set a default scope";
    if (scope) {
      hint = `Check the \`${scope}\` scope(s)`;
    }
    return new OAuthException(message, ErrorType.InvalidScope, hint, redirectUri);
  }

  /**
   * This client is not authorized to use the requested grant type. For example, if you
   * restrict which applications can use the Implicit grant, you would return this error
   * for the other apps.
   */
  static unauthorizedClient() {
    return new OAuthException(`unauthorized client`, ErrorType.UnauthorizedClient);
  }

  /**
   * If a grant type is requested that the authorization server doesn’t recognize, use
   * this code. Note that unknown grant types also use this specific error code
   * rather than using the invalid_request above.
   */
  static unsupportedGrantType() {
    return new OAuthException("unsupported grant_type", ErrorType.UnsupportedGrantType);
  }

  static badRequest(message: string) {
    return new OAuthException(message, ErrorType.InvalidRequest, undefined, undefined, HttpStatus.BAD_REQUEST);
  }

  static accessDenied(errorDescription?: string) {
    return new OAuthException(
      "The resource owner or authorization server denied the request",
      ErrorType.AccessDenied,
      errorDescription,
      undefined,
      HttpStatus.UNAUTHORIZED,
    );
  }
}
