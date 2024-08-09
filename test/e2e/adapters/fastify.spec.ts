import { describe, it, expect, vi } from "vitest";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  handleFastifyError,
  handleFastifyReply,
  requestFromFastify,
  responseFromFastify,
} from "../../../src/adapters/fastify.js";
import { ErrorType, OAuthException, OAuthRequest, OAuthResponse } from "../../../src/index.js";

describe("adapters/fastify.js", () => {
  describe("responseFromFastify", () => {
    it("should create an OAuthResponse from a FastifyReply", () => {
      const mockFastifyReply = {
        headers: { "content-type": "application/json" },
      } as unknown as FastifyReply;
      const result = responseFromFastify(mockFastifyReply);
      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.headers).toEqual({ "content-type": "application/json" });
    });

    it("should handle undefined headers", () => {
      const mockFastifyReply = {} as FastifyReply;
      const result = responseFromFastify(mockFastifyReply);
      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.headers).toEqual({});
    });
  });

  describe("requestFromFastify", () => {
    it("should create an OAuthRequest from a FastifyRequest", () => {
      const mockFastifyRequest = {
        query: { foo: "bar" },
        body: { baz: "qux" },
        headers: { "content-type": "application/json" },
      } as FastifyRequest;
      const result = requestFromFastify(mockFastifyRequest);
      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.query).toEqual({ foo: "bar" });
      expect(result.body).toEqual({ baz: "qux" });
      expect(result.headers).toEqual({ "content-type": "application/json" });
    });

    it("should handle undefined properties", () => {
      const mockFastifyRequest = {} as FastifyRequest;
      const result = requestFromFastify(mockFastifyRequest);
      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.query).toEqual({});
      expect(result.body).toEqual({});
      expect(result.headers).toEqual({});
    });
  });

  describe("handleFastifyError", () => {
    it("should handle OAuthException", () => {
      const mockFastifyReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const oauthError = new OAuthException("Test error", ErrorType.InternalServerError, undefined, undefined, 400);

      handleFastifyError(oauthError, mockFastifyReply);

      expect(mockFastifyReply.status).toHaveBeenCalledWith(400);
      expect(mockFastifyReply.send).toHaveBeenCalledWith({
        status: 400,
        message: "Test error",
        error: "server_error",
        error_description: "Test error",
      });
    });

    it("should rethrow non-OAuthException errors", () => {
      const mockFastifyReply = {} as FastifyReply;
      const error = new Error("Regular error");

      expect(() => handleFastifyError(error, mockFastifyReply)).toThrow("Regular error");
    });
  });

  describe("handleFastifyReply", () => {
    it("should handle redirect responses", () => {
      const mockFastifyReply = {
        headers: vi.fn(),
        redirect: vi.fn(),
      } as unknown as FastifyReply;

      const mockOAuthResponse = {
        status: 302,
        headers: { location: "https://example.com" },
      } as OAuthResponse;

      handleFastifyReply(mockFastifyReply, mockOAuthResponse);

      expect(mockFastifyReply.headers).toHaveBeenCalledWith(mockOAuthResponse.headers);
      expect(mockFastifyReply.redirect).toHaveBeenCalledWith("https://example.com");
    });

    it("should handle non-redirect responses", () => {
      const mockFastifyReply = {
        headers: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const mockOAuthResponse = {
        status: 200,
        headers: { "content-type": "application/json" },
        body: { message: "Success" },
      } as unknown as OAuthResponse;

      handleFastifyReply(mockFastifyReply, mockOAuthResponse);

      expect(mockFastifyReply.headers).toHaveBeenCalledWith(mockOAuthResponse.headers);
      expect(mockFastifyReply.status).toHaveBeenCalledWith(200);
      expect(mockFastifyReply.send).toHaveBeenCalledWith({ message: "Success" });
    });

    it("should throw an error for redirect without location", () => {
      const mockFastifyReply = {} as FastifyReply;
      const mockOAuthResponse = {
        status: 302,
        headers: {},
      } as OAuthResponse;

      expect(() => handleFastifyReply(mockFastifyReply, mockOAuthResponse)).toThrow("missing redirect location");
    });
  });
});
