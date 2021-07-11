import crypto from "crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";

import { OAuthException } from "../exceptions/oauth.exception";
import { OAuthResponse } from "../responses/response";

export function generateRandomToken(len = 80) {
  return crypto.randomBytes(len * 2).toString("hex");
}

export function handleExpressResponse(_req: ExpressRequest, res: ExpressResponse, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) throw new Error("missing redirect location");
    res.set(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.set(response.headers);
    res.status(response.status).send(response.body);
  }
}

export function handleFastifyResponse(_req: FastifyRequest, res: FastifyReply, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) throw new Error("missing redirect location");
    res.headers(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.headers(response.headers);
    res.status(response.status).send(response.body);
  }
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

export function handleExpressError(e: any, res: ExpressResponse) {
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
