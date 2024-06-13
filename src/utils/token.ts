import { randomBytes } from "node:crypto";

export function generateRandomToken(len = 80): string {
  return randomBytes(len / 2).toString("hex");
}
