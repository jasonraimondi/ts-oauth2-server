import type { FastifyReply, FastifyRequest } from "fastify";
import { OAuthException } from "../exceptions/oauth.exception.js";

import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { isOAuthError } from "../utils/errors.js";

export function responseFromFastify(res: FastifyReply): OAuthResponse {
  return new OAuthResponse({
    headers: <Record<string, unknown>>(<unknown>res.headers) ?? {},
  });
}

export function requestFromFastify(req: FastifyRequest): OAuthRequest {
  return new OAuthRequest({
    query: <Record<string, unknown>>req.query ?? {},
    body: <Record<string, unknown>>req.body ?? {},
    headers: <Record<string, unknown>>req.headers ?? {},
  });
}

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
  throw e;
}

export function handleFastifyReply(res: FastifyReply, response: OAuthResponse): void {
  if (response.status === 302) {
    if (!response.headers.location) throw new Error("missing redirect location");
    res.headers(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.headers(response.headers);
    res.status(response.status).send(response.body);
  }
}
