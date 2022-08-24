import { describe, it, expect } from "vitest";

import { getSecondsUntil } from "../../../src/utils/time";

describe("utils/time", () => {
  it("can calculate seconds until a future date", () => {
    const expiresAt = () => new Date(Date.now() + 60 * 60 * 1000);
    // flaky test, randomly fails with 3589
    expect(getSecondsUntil(expiresAt(), new Date(Date.now() + 10 * 1000))).toBe(3590);
    expect(getSecondsUntil(expiresAt(), new Date())).toBe(3600);
    expect(getSecondsUntil(expiresAt())).toBe(3600);
  });
});
