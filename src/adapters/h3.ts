import type { H3Event } from "h3";
import { OAuthException } from "../exceptions/oauth.exception.js";

import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { isOAuthError } from "../utils/errors.js";

/**
 * Converts an H3Event to an OAuthRequest.
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
  // Dynamic import to avoid requiring h3 as a dependency
  const { getQuery, getHeaders, readBody } = await import("h3");

  const query = getQuery(event) as Record<string, unknown>;
  const headers = getHeaders(event) as Record<string, unknown>;

  let body: Record<string, unknown> = {};
  const method = event.method?.toUpperCase() ?? event.node.req.method?.toUpperCase();

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      body = (await readBody(event)) ?? {};
    } catch {
      body = {};
    }
  }

  return new OAuthRequest({
    query,
    body,
    headers,
  });
}

/**
 * Sends an OAuthResponse back through H3.
 * Properly handles both regular responses and redirects.
 *
 * @param event - H3 Event object
 * @param oauthResponse - OAuth response to send
 * @returns Promise that resolves when response is sent
 *
 * @example
 * ```ts
 * import { requestFromH3, responseToH3 } from "@jmondi/oauth2-server/h3";
 *
 * export default defineEventHandler(async (event) => {
 *   const oauthResponse = await authorizationServer.respondToAccessTokenRequest(
 *     await requestFromH3(event)
 *   );
 *   return responseToH3(event, oauthResponse);
 * });
 * ```
 */
export async function responseToH3(event: H3Event, oauthResponse: OAuthResponse): Promise<void> {
  const { sendRedirect, setResponseStatus, setHeaders, send } = await import("h3");

  if (oauthResponse.status === 302) {
    if (typeof oauthResponse.headers.location !== "string" || oauthResponse.headers.location === "") {
      throw new Error("missing redirect location");
    }
    return sendRedirect(event, oauthResponse.headers.location, 302);
  }

  setResponseStatus(event, oauthResponse.status);

  // Convert headers to string values for H3
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(oauthResponse.headers)) {
    if (value !== undefined && value !== null) {
      headers[key] = String(value);
    }
  }
  setHeaders(event, headers);

  return send(event, JSON.stringify(oauthResponse.body), "application/json");
}

/**
 * Handles OAuth errors in H3 applications.
 * Converts OAuthExceptions to appropriate HTTP responses.
 * Generic errors are automatically converted to 500 Internal Server Error.
 *
 * @param event - H3 Event object
 * @param e - Error object, typically an OAuthException
 * @returns Promise that resolves when error response is sent
 *
 * @example
 * ```ts
 * import { requestFromH3, responseToH3, handleH3Error } from "@jmondi/oauth2-server/h3";
 *
 * export default defineEventHandler(async (event) => {
 *   try {
 *     const oauthResponse = await authorizationServer.respondToAccessTokenRequest(
 *       await requestFromH3(event)
 *     );
 *     return responseToH3(event, oauthResponse);
 *   } catch (e) {
 *     return handleH3Error(event, e);
 *   }
 * });
 * ```
 */
export async function handleH3Error(event: H3Event, e: unknown | OAuthException): Promise<void> {
  const { setResponseStatus, setHeaders, send } = await import("h3");

  if (isOAuthError(e)) {
    setResponseStatus(event, e.status);
    setHeaders(event, { "content-type": "application/json" });
    return send(
      event,
      JSON.stringify({
        status: e.status,
        message: e.message,
        error: e.errorType,
        error_description: e.errorDescription ?? e.error,
      }),
      "application/json",
    );
  }

  // Convert generic errors to OAuthException
  const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred";
  const oauthError = OAuthException.internalServerError(errorMessage);

  setResponseStatus(event, oauthError.status);
  setHeaders(event, { "content-type": "application/json" });
  return send(
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