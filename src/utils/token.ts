import { randomBytes } from "crypto";

export function generateRandomToken(len = 80): string {
  return randomBytes(len / 2).toString("hex");
}
