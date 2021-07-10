import crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";

import { OAuthResponse, OAuthException } from "../../../../src";

export function generateRandomToken() {
  return crypto.randomBytes(40).toString("hex");
}

export function handleError(e: any, res: FastifyReply) {
  if (e instanceof OAuthException) {
    res.status(e.status);
    res.send({
      status: e.status,
      message: e.message,
    });
    return;
  }
  throw e;
}

export function handleResponse(_req: FastifyRequest, res: FastifyReply, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) {
      throw new Error("missing redirect location"); // @todo this
    }
    res.headers(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.headers(response.headers);
    res.status(response.status).send(response.body);
  }
}
