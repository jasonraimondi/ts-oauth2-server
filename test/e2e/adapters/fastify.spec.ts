import { describe, it, expect, vi } from "vitest";
import { FastifyReply, FastifyRequest } from "fastify";
import { handleFastifyError, requestFromFastify, responseFromFastify } from "../../../src/adapters/fastify.js";
import { ErrorType, OAuthException, OAuthRequest, OAuthResponse } from "../../../src/index.js";

describe("Fastify OAuth Utilities", () => {
  describe("responseFromFastify", () => {
    it("should create an OAuthResponse from FastifyReply", () => {
      const mockReply = {
        headers: { "Content-Type": "application/json" },
      } as unknown as FastifyReply;

      const result = responseFromFastify(mockReply);
      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.headers).toEqual({ "Content-Type": "application/json" });
    });
  });

  describe("requestFromFastify", () => {
    it("should create an OAuthRequest from FastifyRequest", () => {
      const mockRequest = {
        query: { code: "abc123" },
        body: { grant_type: "authorization_code" },
        headers: { "Content-Type": "application/json" },
      } as unknown as FastifyRequest;

      const result = requestFromFastify(mockRequest);
      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.query).toEqual({ code: "abc123" });
      expect(result.body).toEqual({ grant_type: "authorization_code" });
      expect(result.headers).toEqual({ "Content-Type": "application/json" });
    });
  });

  describe("handleFastifyError", () => {
    it("should handle OAuthException", () => {
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const oauthError = new OAuthException("Test error", ErrorType.InternalServerError);
      handleFastifyError(oauthError, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 400,
        message: "Test error",
        error: "server_error",
        error_description: "Test error",
      });
    });

    it("should throw non-OAuthException errors", () => {
      const mockReply = {} as FastifyReply;
      const error = new Error("Regular error");

      expect(() => handleFastifyError(error, mockReply)).toThrow("Regular error");
    });
  });
});
