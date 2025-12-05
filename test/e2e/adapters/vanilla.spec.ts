import { describe, it, expect, beforeEach } from "vitest";
import { requestFromVanilla, responseFromVanilla, responseToVanilla, handleVanillaError } from "../../../src/adapters/vanilla.js";
import { ErrorType, OAuthException, OAuthRequest, OAuthResponse } from "../../../src/index.js";
import { RedirectResponse } from "../../../src/responses/redirect.response.js";

describe("adapters/vanilla.js", () => {
  describe("responseFromVanilla", () => {
    it("should create an OAuthResponse from a vanilla Response", () => {
      const mockHeaders = new Headers({
        "content-type": "application/json",
        "x-custom-header": "custom-value",
      });
      const mockResponse = { headers: mockHeaders } as Response;

      const result = responseFromVanilla(mockResponse);

      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.headers).toEqual({
        "content-type": "application/json",
        "x-custom-header": "custom-value",
      });
    });
  });

  describe("responseToVanilla", () => {
    it("should create a vanilla Response from an OAuthResponse for non-redirect", () => {
      const oauthResponse = new OAuthResponse({
        status: 200,
        headers: { "content-type": "application/json" },
        body: { message: "Success" },
      });

      const result = responseToVanilla(oauthResponse);

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(200);
      expect(result.headers.get("content-type")).toBe("application/json");
      expect(result.json()).resolves.toEqual({ message: "Success" });
    });

    it("should create a redirect Response for status 302", () => {
      const oauthResponse = new RedirectResponse("https://example.com");

      const result = responseToVanilla(oauthResponse);

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(302);
      expect(result.headers.get("Location")).toBe("https://example.com");
    });

    it("should throw an OAuthException for redirect without location", () => {
      // ts-ignore
      const oauthResponse = new RedirectResponse();

      expect(() => responseToVanilla(oauthResponse)).toThrow(OAuthException);
    });
  });

  describe("requestFromVanilla", () => {
    let mockRequest: Request;

    beforeEach(() => {
      mockRequest = new Request("https://example.com/path?param1=value1&param2=value2", {
        method: "POST",
        duplex: "half",
        headers: new Headers({
          "content-type": "application/json",
          "x-custom-header": "custom-value",
        }),
        body: JSON.stringify({ key: "value" }),
      } as RequestInit);
    });

    it("should create an OAuthRequest from a vanilla Request", async () => {
      const result = await requestFromVanilla(mockRequest);

      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.query).toEqual({ param1: "value1", param2: "value2" });
      expect(result.body).toEqual({ key: "value" });
      expect(result.headers).toEqual({
        "content-type": "application/json",
        "x-custom-header": "custom-value",
      });
    });

    it("should handle requests of type application/x-www-form-urlencoded", async () => {
      mockRequest = new Request("https://example.com/path?param1=value1&param2=value2", {
        method: "POST",
        duplex: "half",
        headers: new Headers({
          "content-type": "application/x-www-form-urlencoded",
        }),
        body: "key1=value1&key2=value2",
      } as RequestInit);

      const result = await requestFromVanilla(mockRequest);

      expect(result.body).toEqual({
        key1: "value1",
        key2: "value2",
      });
    });

    it("should handle requests without body", async () => {
      mockRequest = new Request("https://example.com/path?param1=value1&param2=value2", {
        headers: new Headers({
          "content-type": "application/json",
          "x-custom-header": "custom-value",
        }),
      });

      const result = await requestFromVanilla(mockRequest);

      expect(result.body).toEqual({});
    });

    it("should handle requests with ReadableStream body", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ streamKey: "streamValue" })));
          controller.close();
        },
      });
      mockRequest = new Request("https://example.com/path?param1=value1&param2=value2", {
        method: "POST",
        duplex: "half",
        headers: new Headers({
          "content-type": "application/json",
        }),
        body: mockStream,
      } as RequestInit);

      const result = await requestFromVanilla(mockRequest);

      expect(result.body).toEqual({ streamKey: "streamValue" });
    });
  });

  describe("handleVanillaError", () => {
    it("should handle OAuthException", () => {
      const oauthError = new OAuthException("Test error", ErrorType.InvalidRequest, "Bad request", undefined, 400);
      const result = handleVanillaError(oauthError);

      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        status: 400,
        message: "Test error: Bad request",
        error: "invalid_request",
        error_description: "Bad request",
      });
    });

    it("should convert non-OAuthException errors to internal server error", () => {
      const error = new Error("Database connection failed");
      const result = handleVanillaError(error);

      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        status: 500,
        message: "Internal server error: Database connection failed",
        error: "server_error",
        error_description: "Database connection failed",
      });
    });

    it("should handle unknown error types gracefully", () => {
      const error = "string error";
      const result = handleVanillaError(error);

      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        status: 500,
        message: "Internal server error: An unexpected error occurred",
        error: "server_error",
        error_description: "An unexpected error occurred",
      });
    });
  });
});
