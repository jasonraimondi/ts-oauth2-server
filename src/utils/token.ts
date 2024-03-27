import crypto from "node:crypto";

export function generateRandomToken(len = 80): string {
  return crypto.randomBytes(len / 2).toString("hex");
}
