import type { FastifyRequest } from "fastify";
import type { Request as ExpressRequest } from "express";

import { Headers, Options } from "../responses/response";

export interface RequestInterface {
  headers: { [key: string]: any };
  query: { [key: string]: any };
  body: { [key: string]: any };
}

export class OAuthRequest implements RequestInterface {
  body: { [key: string]: any };
  headers: Headers = {};
  query: { [key: string]: any };

  constructor(options: Options = {}) {
    this.headers = {
      ...options.headers,
    };
    this.query = {
      ...options.query,
    };
    this.body = {
      ...options.body,
    };
  }

  static fromExpress(express: ExpressRequest) {
    return new OAuthRequest(express);
  }

  static fromFastify(fastify: FastifyRequest) {
    return new OAuthRequest({
      query: <Record<string, unknown>>fastify.query ?? {},
      body: <Record<string, unknown>>fastify.body ?? {},
      headers: <Record<string, unknown>>fastify.headers ?? {},
    });
  }

  set(fieldOrHeaders: string, value: any): void {
    this.headers[fieldOrHeaders.toLowerCase()] = value;
  }
}
