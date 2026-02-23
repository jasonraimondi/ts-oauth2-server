import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";
import { requestFromH3, responseFromH3, handleH3Response, handleH3Error } from "../../../src/adapters/h3.js";
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

    mockEvent = { method: "GET" } as unknown as H3Event;
  });

  describe("responseFromH3", () => {
    it("should create an OAuthResponse from an H3Event", () => {
      h3Mocks.getHeaders.mockReturnValue({ "content-type": "application/json" });

      const result = responseFromH3(mockEvent);

      expect(result).toBeInstanceOf(OAuthResponse);
      expect(result.headers).toEqual({ "content-type": "application/json" });
    });
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
      mockEvent = { method: "POST" } as unknown as H3Event;

      h3Mocks.getQuery.mockReturnValue({});
      h3Mocks.getHeaders.mockReturnValue({ "content-type": "application/x-www-form-urlencoded" });
      h3Mocks.readBody.mockResolvedValue({ grant_type: "client_credentials" });

      const result = await requestFromH3(mockEvent);

      expect(result).toBeInstanceOf(OAuthRequest);
      expect(result.body).toEqual({ grant_type: "client_credentials" });
      expect(h3Mocks.readBody).toHaveBeenCalledWith(mockEvent);
    });

    it("should handle undefined body gracefully", async () => {
      mockEvent = { method: "POST" } as unknown as H3Event;

      h3Mocks.getQuery.mockReturnValue({});
      h3Mocks.getHeaders.mockReturnValue({});
      h3Mocks.readBody.mockResolvedValue(undefined);

      const result = await requestFromH3(mockEvent);

      expect(result.body).toEqual({});
    });

    it("should handle PUT and PATCH methods", async () => {
      for (const method of ["PUT", "PATCH"]) {
        mockEvent = { method } as unknown as H3Event;

        h3Mocks.getQuery.mockReturnValue({});
        h3Mocks.getHeaders.mockReturnValue({});
        h3Mocks.readBody.mockResolvedValue({ data: "test" });

        const result = await requestFromH3(mockEvent);

        expect(result.body).toEqual({ data: "test" });
      }
    });
  });

  describe("handleH3Response", () => {
    it("should handle redirect responses", () => {
      const oauthResponse = new OAuthResponse({
        status: 302,
        headers: { location: "https://example.com/callback" },
      });

      handleH3Response(mockEvent, oauthResponse);

      expect(h3Mocks.sendRedirect).toHaveBeenCalledWith(mockEvent, "https://example.com/callback", 302);
      expect(h3Mocks.send).not.toHaveBeenCalled();
    });

    it("should throw error for redirect without location", () => {
      const oauthResponse = new OAuthResponse({ status: 302, headers: {} });

      expect(() => handleH3Response(mockEvent, oauthResponse)).toThrow("missing redirect location");
    });

    it("should handle non-redirect responses", () => {
      const oauthResponse = new OAuthResponse({
        status: 200,
        headers: { "cache-control": "no-store" },
        body: { access_token: "token123", token_type: "Bearer" },
      });

      handleH3Response(mockEvent, oauthResponse);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 200);
      expect(h3Mocks.setHeaders).toHaveBeenCalledWith(mockEvent, { "cache-control": "no-store" });
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        JSON.stringify({ access_token: "token123", token_type: "Bearer" }),
        "application/json",
      );
    });
  });

  describe("handleH3Error", () => {
    it("should handle OAuthException", () => {
      const oauthError = new OAuthException("Invalid client", ErrorType.InvalidClient, undefined, undefined, 401);

      handleH3Error(oauthError, mockEvent);

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

    it("should convert non-OAuthException errors to internal server error", () => {
      const error = new Error("Database connection failed");

      handleH3Error(error, mockEvent);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 500);
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining("Database connection failed"),
        "application/json",
      );
    });

    it("should handle unknown error types gracefully", () => {
      handleH3Error("string error", mockEvent);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 500);
      expect(h3Mocks.send).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining("An unexpected error occurred"),
        "application/json",
      );
    });

    it("should handle null/undefined errors", () => {
      handleH3Error(null, mockEvent);

      expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(mockEvent, 500);
    });
  });
});
