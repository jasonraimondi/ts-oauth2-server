import { getSecondsUntil } from "../../../src/utils/time";

describe("utils/time", () => {
  it("can calculate seconds until a future date", () => {
    const expiresAt = () => new Date(Date.now() + 60 * 60 * 1000);
    expect(getSecondsUntil(expiresAt(), new Date(Date.now() + 5 * 1000))).toBe(3595);
    expect(getSecondsUntil(expiresAt(), new Date())).toBe(3600);
    expect(getSecondsUntil(expiresAt())).toBe(3600);
  });
});
