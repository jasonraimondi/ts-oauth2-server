import { describe, expect, it } from "vitest";

import { redirectUriMatches, tryParseUrl } from "../../../src/utils/urls.js";

describe("utils/urls tryParseUrl", () => {
  it("parses an absolute https uri", () => {
    const parsed = tryParseUrl("https://example.com/callback");

    expect(parsed).toBeInstanceOf(URL);
    expect(parsed?.href).toBe("https://example.com/callback");
  });

  it("returns undefined for a relative uri", () => {
    expect(tryParseUrl("/callback")).toBeUndefined();
  });

  it("parses custom-scheme uris", () => {
    expect(tryParseUrl("myapp://callback")?.href).toBe("myapp://callback");
    expect(tryParseUrl("com.example.app:/oauth2redirect")?.href).toBe("com.example.app:/oauth2redirect");
  });

  it("returns undefined for unparseable uris", () => {
    expect(tryParseUrl("//example.com/callback")).toBeUndefined();
    expect(tryParseUrl("")).toBeUndefined();
    expect(tryParseUrl("not a uri")).toBeUndefined();
    expect(tryParseUrl("https://")).toBeUndefined();
  });
});

describe("redirectUriMatches", () => {
  describe("exact matching", () => {
    it("matches an identical uri", () => {
      expect(redirectUriMatches("https://app.example.com/cb", "https://app.example.com/cb")).toBe(true);
    });

    it("matches when only url normalization differs", () => {
      expect(redirectUriMatches("https://app.example.com:443/cb", "https://app.example.com/cb")).toBe(true);
      expect(redirectUriMatches("HTTPS://APP.EXAMPLE.COM/cb", "https://app.example.com/cb")).toBe(true);
      expect(redirectUriMatches("http://example.com", "http://example.com/")).toBe(true);
    });

    it("matches a registered uri with an identical querystring", () => {
      expect(redirectUriMatches("http://example.com?env=prod", "http://example.com?env=prod")).toBe(true);
    });

    it("rejects a port difference on a non-loopback host", () => {
      expect(redirectUriMatches("https://app.example.com:8443/cb", "https://app.example.com/cb")).toBe(false);
      expect(redirectUriMatches("http://oauth2.example.com:3000/callback", "http://oauth2.example.com/callback")).toBe(
        false,
      );
    });

    it("rejects querystring differences", () => {
      expect(redirectUriMatches("http://example.com?extra=1", "http://example.com")).toBe(false);
      expect(redirectUriMatches("http://example.com?env=evil", "http://example.com?env=prod")).toBe(false);
    });

    it("rejects host, scheme, and path differences", () => {
      expect(redirectUriMatches("https://evil.example.com/cb", "https://app.example.com/cb")).toBe(false);
      expect(redirectUriMatches("http://app.example.com/cb", "https://app.example.com/cb")).toBe(false);
      expect(redirectUriMatches("https://app.example.com/cb/extra", "https://app.example.com/cb")).toBe(false);
      expect(redirectUriMatches("https://app.example.com/cb/", "https://app.example.com/cb")).toBe(false);
    });
  });

  describe("loopback port exception", () => {
    it.each(["localhost", "127.0.0.1", "[::1]"])("allows a port difference for %s", hostname => {
      expect(redirectUriMatches(`http://${hostname}:51004/cb`, `http://${hostname}/cb`)).toBe(true);
      expect(redirectUriMatches(`http://${hostname}:51004/cb`, `http://${hostname}:3000/cb`)).toBe(true);
    });

    it("still requires the path to match on loopback", () => {
      expect(redirectUriMatches("http://localhost:3000/evil", "http://localhost/cb")).toBe(false);
    });

    it("still requires the querystring to match on loopback", () => {
      expect(redirectUriMatches("http://localhost:3000/cb?extra=1", "http://localhost/cb")).toBe(false);
    });

    it("does not cross-match localhost and 127.0.0.1", () => {
      expect(redirectUriMatches("http://127.0.0.1:3000/cb", "http://localhost/cb")).toBe(false);
      expect(redirectUriMatches("http://localhost:3000/cb", "http://127.0.0.1/cb")).toBe(false);
    });
  });

  describe("custom schemes", () => {
    it("matches an identical custom-scheme uri", () => {
      expect(redirectUriMatches("com.exampleapp.oauth2://callback", "com.exampleapp.oauth2://callback")).toBe(true);
    });

    it("rejects a port added to a custom-scheme uri", () => {
      expect(redirectUriMatches("com.exampleapp.oauth2://callback:3000", "com.exampleapp.oauth2://callback")).toBe(
        false,
      );
    });
  });

  describe("unparseable values", () => {
    it("falls back to string equality", () => {
      expect(redirectUriMatches("/relative/path", "/relative/path")).toBe(true);
      expect(redirectUriMatches("/relative/path", "/other/path")).toBe(false);
      expect(redirectUriMatches("/relative/path", "https://app.example.com/cb")).toBe(false);
    });
  });
});
