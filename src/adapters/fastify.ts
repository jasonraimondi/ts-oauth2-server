import type { FastifyReply, FastifyRequest } from "fastify";
import { OAuthException } from "../exceptions/oauth.exception.js";

import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { isOAuthError } from "../utils/errors.js";

/**
 * Converts a Fastify Reply object to an OAuthResponse.
 *
 * @param res - Fastify Reply object
 * @returns OAuthResponse instance
 */
export function responseFromFastify(res: FastifyReply): OAuthResponse {
  return new OAuthResponse({
    headers: <Record<string, unknown>>(<unknown>res.headers) ?? {},
  });
}

/**
 * Converts a Fastify Request object to an OAuthRequest.
 *
 * @param req - Fastify Request object
 * @returns OAuthRequest instance
 *
 * @example
 * ```ts
 * import { requestFromFastify } from "@jmondi/oauth2-server/fastify";
 *
 * const authRequest = await authorizationServer.validateAuthorizationRequest(
 *   requestFromFastify(req)
 * );
 * ```
 */
export function requestFromFastify(req: FastifyRequest): OAuthRequest {
  return new OAuthRequest({
    query: <Record<string, unknown>>req.query ?? {},
    body: <Record<string, unknown>>req.body ?? {},
    headers: <Record<string, unknown>>req.headers ?? {},
  });
}

/**
 * Handles OAuth errors in Fastify applications.
 * Converts OAuthExceptions to appropriate HTTP responses.
 * Generic errors are automatically converted to 500 Internal Server Error.
 *
 * @param e - Error object, typically an OAuthException
 * @param res - Fastify Reply object
 *
 * @example
 * ```ts
 * try {
 *   const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 *   return handleFastifyReply(res, oauthResponse);
 * } catch (e) {
 *   handleFastifyError(e, res);
 * }
 * ```
 */
// @todo v4.0 flip these to always be Fastify as first arg, OAuth as second. Then update Docs
export function handleFastifyError(e: unknown | OAuthException, res: FastifyReply): void {
  if (isOAuthError(e)) {
    res.status(e.status).send({
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

  res.status(oauthError.status).send({
    status: oauthError.status,
    message: oauthError.message,
    error: oauthError.errorType,
    error_description: oauthError.errorDescription ?? oauthError.error,
  });
}

/**
 * Handles sending an OAuthResponse back through Fastify.
 * Properly handles both regular responses and redirects.
 *
 * @param res - Fastify Reply object
 * @param response - OAuth response to send
 *
 * @example
 * ```ts
 * const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 * return handleFastifyReply(res, oauthResponse);
 * ```
 */
export function handleFastifyReply(res: FastifyReply, response: OAuthResponse): void {
  if (response.status === 302) {
    if (!response.headers.location) throw new Error("missing redirect location");
    res.headers(response.headers);
    res.redirect(response.headers.location, 302);
  } else {
    res.headers(response.headers);
    res.status(response.status).send(response.body);
  }
}
