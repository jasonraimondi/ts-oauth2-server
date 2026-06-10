import { describe, it, expect } from "vitest";
import { parseRedirectUri } from "../../../src/utils/urls.js";

describe("utils/urls parseRedirectUri", () => {
  it("parses an absolute https uri", () => {
    const parsed = parseRedirectUri("https://example.com/callback");

    expect(parsed).toBeInstanceOf(URL);
    expect(parsed?.href).toBe("https://example.com/callback");
  });

  it("returns undefined for a relative uri", () => {
    expect(parseRedirectUri("/callback")).toBeUndefined();
  });

  it("parses custom-scheme uris", () => {
    expect(parseRedirectUri("myapp://callback")).toBeInstanceOf(URL);
    expect(parseRedirectUri("com.example.app:/oauth2redirect")).toBeInstanceOf(URL);
  });

  it("returns undefined for unparseable uris", () => {
    expect(parseRedirectUri("//example.com/callback")).toBeUndefined();
    expect(parseRedirectUri("")).toBeUndefined();
    expect(parseRedirectUri("not a uri")).toBeUndefined();
    expect(parseRedirectUri("https://")).toBeUndefined();
  });

  it("exposes an empty hash for a bare trailing # and the fragment otherwise", () => {
    expect(parseRedirectUri("https://example.com/callback#")?.hash).toBe("");
    expect(parseRedirectUri("https://example.com/callback#fragment")?.hash).toBe("#fragment");
  });
});
