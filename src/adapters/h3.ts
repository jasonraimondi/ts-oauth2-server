import { getQuery, getHeaders, readBody, sendRedirect, setResponseStatus, setHeaders, send } from "h3";
import type { H3Event } from "h3";
import { OAuthException } from "../exceptions/oauth.exception.js";

import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { isOAuthError } from "../utils/errors.js";

/**
 * Converts an H3 Event to an OAuthResponse.
 *
 * @param event - H3 Event object
 * @returns OAuthResponse instance
 */
export function responseFromH3(event: H3Event): OAuthResponse {
  return new OAuthResponse({
    headers: getHeaders(event) as Record<string, unknown>,
  });
}

/**
 * Converts an H3 Event to an OAuthRequest.
 * Handles extracting query params, body, and headers from the H3 event.
 *
 * @param event - H3 Event object
 * @returns Promise that resolves to an OAuthRequest instance
 *
 * @example
 * ```ts
 * import { requestFromH3 } from "@jmondi/oauth2-server/h3";
 *
 * export default defineEventHandler(async (event) => {
 *   const authRequest = await authorizationServer.validateAuthorizationRequest(
 *     await requestFromH3(event)
 *   );
 * });
 * ```
 */
export async function requestFromH3(event: H3Event): Promise<OAuthRequest> {
  const query = getQuery(event) as Record<string, unknown>;
  const headers = getHeaders(event) as Record<string, unknown>;

  let body: Record<string, unknown> = {};

  if (event.method === "POST" || event.method === "PUT" || event.method === "PATCH") {
    body = (await readBody(event)) ?? {};
  }

  return new OAuthRequest({ query, body, headers });
}

/**
 * Sends an OAuthResponse back through H3.
 * Properly handles both regular responses and redirects.
 *
 * @param event - H3 Event object
 * @param oauthResponse - OAuth response to send
 *
 * @example
 * ```ts
 * import { requestFromH3, handleH3Response } from "@jmondi/oauth2-server/h3";
 *
 * export default defineEventHandler(async (event) => {
 *   const oauthResponse = await authorizationServer.respondToAccessTokenRequest(
 *     await requestFromH3(event)
 *   );
 *   return handleH3Response(event, oauthResponse);
 * });
 * ```
 */
export function handleH3Response(event: H3Event, oauthResponse: OAuthResponse): void {
  if (oauthResponse.status === 302) {
    if (!oauthResponse.headers.location) throw new Error("missing redirect location");
    sendRedirect(event, oauthResponse.headers.location, 302);
    return;
  }

  setResponseStatus(event, oauthResponse.status);
  setHeaders(event, oauthResponse.headers);
  send(event, JSON.stringify(oauthResponse.body), "application/json");
}

/**
 * Handles OAuth errors in H3 applications.
 * Converts OAuthExceptions to appropriate HTTP responses.
 * Generic errors are automatically converted to 500 Internal Server Error.
 *
 * @param e - Error object, typically an OAuthException
 * @param event - H3 Event object
 *
 * @example
 * ```ts
 * import { requestFromH3, handleH3Response, handleH3Error } from "@jmondi/oauth2-server/h3";
 *
 * export default defineEventHandler(async (event) => {
 *   try {
 *     const oauthResponse = await authorizationServer.respondToAccessTokenRequest(
 *       await requestFromH3(event)
 *     );
 *     return handleH3Response(event, oauthResponse);
 *   } catch (e) {
 *     return handleH3Error(e, event);
 *   }
 * });
 * ```
 */
export function handleH3Error(e: unknown | OAuthException, event: H3Event): void {
  if (isOAuthError(e)) {
    setResponseStatus(event, e.status);
    setHeaders(event, { "content-type": "application/json" });
    send(
      event,
      JSON.stringify({
        status: e.status,
        message: e.message,
        error: e.errorType,
        error_description: e.errorDescription ?? e.error,
      }),
      "application/json",
    );
    return;
  }

  const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred";
  const oauthError = OAuthException.internalServerError(errorMessage);

  setResponseStatus(event, oauthError.status);
  setHeaders(event, { "content-type": "application/json" });
  send(
    event,
    JSON.stringify({
      status: oauthError.status,
      message: oauthError.message,
      error: oauthError.errorType,
      error_description: oauthError.errorDescription ?? oauthError.error,
    }),
    "application/json",
  );
}
