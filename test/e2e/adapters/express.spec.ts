import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";
import {
  requestFromExpress,
  responseFromExpress,
  handleExpressResponse,
  handleExpressError,
} from "../../../src/adapters/express.js";
import { ErrorType, OAuthException, OAuthRequest, OAuthResponse } from "../../../src/index.js";

describe("adapters/express.js", () => {
  describe("responseFromExpress", () => {
    it("should create an OAuthResponse from an Express Response", () => {
      const mockExpressRes = {} as Response;
      const result = responseFromExpress(mockExpressRes);
      expect(result).toBeInstanceOf(OAuthResponse);
    });
  });

  describe("requestFromExpress", () => {
    it("should create an OAuthRequest from an Express Request", () => {
      const mockExpressReq = {} as Request;
      const result = requestFromExpress(mockExpressReq);
      expect(result).toBeInstanceOf(OAuthRequest);
    });
  });

  describe("handleExpressResponse", () => {
    it("should handle redirect responses", () => {
      const mockExpressRes = {
        set: vi.fn(),
        redirect: vi.fn(),
      } as unknown as Response;

      const mockOAuthRes = {
        status: 302,
        headers: { location: "https://example.com" },
      } as OAuthResponse;

      handleExpressResponse(mockExpressRes, mockOAuthRes);

      expect(mockExpressRes.set).toHaveBeenCalledWith(mockOAuthRes.headers);
      expect(mockExpressRes.redirect).toHaveBeenCalledWith("https://example.com");
    });

    it("should handle non-redirect responses", () => {
      const mockExpressRes = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      const mockOAuthRes = {
        status: 200,
        headers: { "content-type": "application/json" },
        body: { message: "Success" },
      } as unknown as OAuthResponse;

      handleExpressResponse(mockExpressRes, mockOAuthRes);

      expect(mockExpressRes.set).toHaveBeenCalledWith(mockOAuthRes.headers);
      expect(mockExpressRes.status).toHaveBeenCalledWith(200);
      expect(mockExpressRes.send).toHaveBeenCalledWith({ message: "Success" });
    });

    it("should throw an error for redirect without location", () => {
      const mockExpressRes = {} as Response;
      const mockOAuthRes = {
        status: 302,
        headers: {},
      } as OAuthResponse;

      expect(() => handleExpressResponse(mockExpressRes, mockOAuthRes)).toThrow("missing redirect location");
    });
  });

  describe("handleExpressError", () => {
    it("should handle OAuthException", () => {
      const mockExpressRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      const oauthError = new OAuthException("Test error", ErrorType.InternalServerError, undefined, undefined, 400);

      handleExpressError(oauthError, mockExpressRes);

      expect(mockExpressRes.status).toHaveBeenCalledWith(400);
      expect(mockExpressRes.send).toHaveBeenCalledWith({
        status: 400,
        message: "Test error",
        error: "server_error",
        error_description: "Test error",
      });
    });

    it("should convert non-OAuthException errors to internal server error", () => {
      const mockExpressRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;
      const error = new Error("Database connection failed");

      handleExpressError(error, mockExpressRes);

      expect(mockExpressRes.status).toHaveBeenCalledWith(500);
      expect(mockExpressRes.send).toHaveBeenCalledWith({
        status: 500,
        message: "Internal server error: Database connection failed",
        error: "server_error",
        error_description: "Database connection failed",
      });
    });

    it("should handle unknown error types gracefully", () => {
      const mockExpressRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      handleExpressError("string error", mockExpressRes);

      expect(mockExpressRes.status).toHaveBeenCalledWith(500);
      expect(mockExpressRes.send).toHaveBeenCalledWith({
        status: 500,
        message: "Internal server error: An unexpected error occurred",
        error: "server_error",
        error_description: "An unexpected error occurred",
      });
    });
  });
});
