import { beforeEach, afterEach, vi } from "vitest";

beforeEach(() => {
  // tell vitest we use mocked time
  vi.useFakeTimers();
  const date = new Date(2021, 11, 11, 0, 0, 0);
  vi.setSystemTime(date);
});

afterEach(() => {
  // restoring date after each test run
  vi.useRealTimers();
});
