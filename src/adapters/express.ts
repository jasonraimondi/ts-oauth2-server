import type { Request, Response } from "express";
import { OAuthException } from "../exceptions/oauth.exception.js";

import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { isOAuthError } from "../utils/errors.js";

/**
 * Converts an Express Response object to an OAuthResponse.
 *
 * @param res - Express Response object
 * @returns OAuthResponse instance
 */
export function responseFromExpress({ status, ...res }: Response): OAuthResponse {
  return new OAuthResponse({ status: res.statusCode ?? 200, ...res });
}

/**
 * Converts an Express Request object to an OAuthRequest.
 *
 * @param req - Express Request object
 * @returns OAuthRequest instance
 *
 * @example
 * ```ts
 * import { requestFromExpress } from "@jmondi/oauth2-server/express";
 *
 * const authRequest = await authorizationServer.validateAuthorizationRequest(
 *   requestFromExpress(req)
 * );
 * ```
 */
export function requestFromExpress(req: Request): OAuthRequest {
  return new OAuthRequest(req);
}

/**
 * Handles sending an OAuthResponse back through Express.
 * Properly handles both regular responses and redirects.
 *
 * @param expressResponse - Express Response object
 * @param oauthResponse - OAuth response to send
 *
 * @example
 * ```ts
 * const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 * return handleExpressResponse(res, oauthResponse);
 * ```
 */
export function handleExpressResponse(expressResponse: Response, oauthResponse: OAuthResponse): void {
  if (oauthResponse.status === 302) {
    if (!oauthResponse.headers.location) throw new Error("missing redirect location");
    expressResponse.set(oauthResponse.headers);
    expressResponse.redirect(oauthResponse.headers.location);
  } else {
    expressResponse.set(oauthResponse.headers);
    expressResponse.status(oauthResponse.status).send(oauthResponse.body);
  }
}

/**
 * Handles OAuth errors in Express applications.
 * Converts OAuthExceptions to appropriate HTTP responses.
 * Generic errors are automatically converted to 500 Internal Server Error.
 *
 * @param e - Error object, typically an OAuthException
 * @param res - Express Response object
 *
 * @example
 * ```ts
 * try {
 *   const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 *   return handleExpressResponse(res, oauthResponse);
 * } catch (e) {
 *   handleExpressError(e, res);
 * }
 * ```
 */
// @todo v4.0 flip these to always be Express as first arg, OAuth as second. Then update Docs
export function handleExpressError(e: unknown | OAuthException, res: Response): void {
  if (isOAuthError(e)) {
    res.status(e.status);
    res.send({
      status: e.status,
      message: e.message,
      error: e.errorType,
      error_description: e.errorDescription ?? e.error,
    });
    return;
  }

  // Convert generic errors to OAuthException
  const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred';
  const oauthError = OAuthException.internalServerError(errorMessage);

  res.status(oauthError.status);
  res.send({
    status: oauthError.status,
    message: oauthError.message,
    error: oauthError.errorType,
    error_description: oauthError.errorDescription ?? oauthError.error,
  });
}
