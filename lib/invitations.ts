import { createHash, randomInt } from "crypto";

const INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const INVITE_CODE_LENGTH = 8;

export function generateInviteCode() {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_CHARS[randomInt(INVITE_CODE_CHARS.length)];
  }
  return code;
}

export function normalizeInviteCode(code: unknown) {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

export function isValidInviteCode(code: string) {
  return /^[A-Z0-9]{8}$/.test(code);
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function invitationExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
