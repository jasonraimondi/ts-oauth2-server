import { describe, it, expect } from "vitest";
import { tryParseUrl } from "../../../src/utils/urls.js";

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
