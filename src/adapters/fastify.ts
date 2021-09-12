import type { FastifyRequest, FastifyReply } from "fastify";
import { OAuthException } from "../exceptions/oauth.exception";

import { OAuthRequest } from "../requests/request";
import { OAuthResponse } from "../responses/response";

export function responseFromFastify(res: FastifyReply) {
  return new OAuthResponse({
    headers: <Record<string, unknown>><unknown>res.headers ?? {},
  });
}

export function requestFromFastify(req: FastifyRequest) {
  return new OAuthRequest({
    query: <Record<string, unknown>>req.query ?? {},
    body: <Record<string, unknown>>req.body ?? {},
    headers: <Record<string, unknown>>req.headers ?? {},
  });
}

export function handleFastifyError(e: unknown | OAuthException, res: FastifyReply) {
  if (e instanceof OAuthException) {
    res.status(e.status).send({
      status: e.status,
      message: e.message,
    });
    return;
  }
  throw e;
}

export function handleFastifyReply(res: FastifyReply, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) throw new Error("missing redirect location");
    res.headers(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.headers(response.headers);
    res.status(response.status).send(response.body);
  }
}
