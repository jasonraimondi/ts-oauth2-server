import type { FastifyRequest, FastifyReply } from "fastify";

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