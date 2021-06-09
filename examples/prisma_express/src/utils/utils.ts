import crypto from "crypto";
import Express from "express";

import { OAuthResponse, OAuthException } from "../../../../src";

export function generateRandomToken() {
  return crypto.randomBytes(40).toString("hex");
}

export function handleError(e: any, res: Express.Response) {
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

export function handleResponse(_req: Express.Request, res: Express.Response, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) {
      throw new Error("missing redirect location"); // @todo this
    }
    res.set(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.set(response.headers);
    res.status(response.status).send(response.body);
  }
}
