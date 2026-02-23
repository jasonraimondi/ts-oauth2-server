import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";
import { requestFromH3, responseToH3, handleH3Error } from "../../../src/adapters/h3.js";
import { ErrorType, OAuthException, OAuthRequest, OAuthResponse } from "../../../src/index.js";

// Mock h3 module
vi.mock("h3", () => ({
  getQuery: vi.fn(),
  getHeaders: vi.fn(),
  readBody: vi.fn(),
  sendRedirect: vi.fn(),
  setResponseStatus: vi.fn(),
  setHeaders: vi.fn(),
  send: vi.fn(),
}));

describe("adapters/h3.js", () => {
  let mockEvent: H3Event;
  let h3Mocks: {
    getQuery: ReturnType<typeof vi.fn>;
    getHeaders: ReturnType<typeof vi.fn>;
    readBody: ReturnType<typeof vi.fn>;
    sendRedirect: ReturnType<typeof vi.fn>;
    setResponseStatus: ReturnType<typeof vi.fn>;
    setHeaders: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked h3 functions
    const h3 = await import("h3");
    h3Mocks = {
      getQuery: h3.getQuery as ReturnType<typeof vi.fn>,
      getHeaders: h3.getHeaders as ReturnType<typeof vi.fn>,
      readBody: h3.readBody as ReturnType<typeof vi.fn>,
      sendRedirect: h3.sendRedirect as ReturnType<typeof vi.fn>,
      setResponseStatus: h3.setResponseStatus as ReturnType<typeof vi.fn>,
      setHeaders: h3.setHeaders as ReturnType<typeof vi.fn>,
      send: h3.send as ReturnType<typeof vi.fn>,
    };

    mockEvent = {
      method: "GET",
      node: { req: { method: "GET" } },
    } as unknown as H3Event;
  });

  describe("requestFromH3", () => {
    it("should create an OAuthRequest from an H3Event with GET method", async () => {
      h3Mocks.getQuery.mockReturnValue({ foo: "bar" });
      h3Mocks.getHeaders.mockReturnValue({ "content-type": "application/json" });

      const result = await requestFromH3(mockEvent);

      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.query).toEqual({ foo: "bar" });
      expect(result.body).toEqual({});
      expect(result.headers).toEqual({ "content-type": "application/json" });
      expect(h3Mocks.readBody).not.toHaveBeenCalled();
    });

    it("should read body for POST requests", async () => {
      mockEvent = {
        method: "POST",
        node: { req: { method: "POST" } },
      } as unknown as H3Event;

      h3Mocks.getQuery.mockReturnValue({});
      h3Mocks.getHeaders.mockReturnValue({ "content-type": "application/x-www-form-urlencoded" });
      h3Mocks.readBody.mockResolvedValue({ grant_type: "client_credentials" });

      const result = await requestFromH3(mockEvent);

      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.body).toEqual({ grant_type: "client_credentials" });
      expect(h3Mocks.readBody).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle undefined body gracefully", async () => {
      mockEvent = {
        method: "POST",
        node: { req: { method: "POST" } },
      } as unknown as H3Event;

      h3Mocks.getQuery.mockReturnValue({});
      h3Mocks.getHeaders.mockReturnValue({});
      h3Mocks.readBody.mockResolvedValue(undefined);

      const result = await requestFromH3(mockEvent);

      expect(result.body).toEqual({});
    });

    it("should handle readBody errors gracefully", async () => {
      mockEvent = {
        method: "POST",
        node: { req: { method: "POST" } },
      } as unknown as H3Event;

      h3Mocks.getQuery.mockReturnValue({});
      h3Mocks.getHeaders.mockReturnValue({});
      h3Mocks.readBody.mockRejectedValue(new Error("Parse error"));

      const result = await requestFromH3(mockEvent);

      expect(result.body).toEqual({});
    });

    it("should handle PUT and PATCH methods", async () => {
      for (const method of ["PUT", "PATCH"]) {
        mockEvent = {
          method,
          node: { req: { method } },
        } as unknown as H3Event;

        h3Mocks.getQuery.mockReturnValue({});
        h3Mocks.getHeaders.mockReturnValue({});
        h3Mocks.readBody.mockResolvedValue({ data: "test" });

        const result = await requestFromH3(mockEvent);

        expect(result.body).toEqual({ data: "test" });
      }
    });
  });

  describe("responseToH3", () => {
    it("should handle redirect responses", async () => {
      const mockOAuthResponse = new OAuthResponse({
        status: 302,
        headers: { location: "https://example.com/callback" },
      });

      await responseToH3(mockEvent, mockOAuthResponse);

      expect(h3Mocks.sendRedirect).toHaveBeenCalledWith(mockEvent, "https://example.com/callback", 302);
      expect(h3Mocks.send).not.toHaveBeenCalled();
    });

    it("should throw error for redirect without location", async () => {
      const mockOAuthResponse = new OAuthResponse({
        status: 302,
        headers: {},
      });

      await expect(responseToH3(mockEvent, mockOAuthResponse)).rejects.toThrow("missing redirect location");
    });

    it("should throw error for redirect with empty location", async () => {
      const mockOAuthResponse = new OAuthResponse({
        status: 302,
        headers: { location: "" },
      });

      await expect(responseToH3(mockEvent, mockOAuthResponse)).rejects.toThrow("missing redirect location");
    });

    it("should handle non-redirect responses", async () => {
      const mockOAuthResponse = new OAuthResponse({
        status: 200,
        headers: { "cache-control": "no-store" },
        body: { access_token: "token123", token_type: "Bearer" },
      });

      await responseToH3(mockEvent, mockOAuthResponse);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 200);
      expect(h3Mocks.setHeaders).toHaveBeenCalledWith(mockEvent, { "cache-control": "no-store" });
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        JSON.stringify({ access_token: "token123", token_type: "Bearer" }),
        "application/json",
      );
    });

    it("should convert header values to strings", async () => {
      const mockOAuthResponse = new OAuthResponse({
        status: 200,
        headers: { "x-custom": 123 as unknown as string },
        body: {},
      });

      await responseToH3(mockEvent, mockOAuthResponse);

      expect(h3Mocks.setHeaders).toHaveBeenCalledWith(mockEvent, { "x-custom": "123" });
    });

    it("should filter out null and undefined header values", async () => {
      const mockOAuthResponse = new OAuthResponse({
        status: 200,
        headers: {
          "x-valid": "value",
          "x-null": null as unknown as string,
          "x-undefined": undefined as unknown as string,
        },
        body: {},
      });

      await responseToH3(mockEvent, mockOAuthResponse);

      expect(h3Mocks.setHeaders).toHaveBeenCalledWith(mockEvent, { "x-valid": "value" });
    });
  });

  describe("handleH3Error", () => {
    it("should handle OAuthException", async () => {
      const oauthError = new OAuthException("Invalid client", ErrorType.InvalidClient, undefined, undefined, 401);

      await handleH3Error(mockEvent, oauthError);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 401);
      expect(h3Mocks.setHeaders).toHaveBeenCalledWith(mockEvent, { "content-type": "application/json" });
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        JSON.stringify({
          status: 401,
          message: "Invalid client",
          error: "invalid_client",
          error_description: "Invalid client",
        }),
        "application/json",
      );
    });

    it("should convert non-OAuthException errors to internal server error", async () => {
      const error = new Error("Database connection failed");

      await handleH3Error(mockEvent, error);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 500);
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining("Database connection failed"),
        "application/json",
      );
    });

    it("should handle unknown error types gracefully", async () => {
      await handleH3Error(mockEvent, "string error");

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 500);
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining("An unexpected error occurred"),
        "application/json",
      );
    });

    it("should handle null/undefined errors", async () => {
      await handleH3Error(mockEvent, null);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 500);
    });
  });
});
