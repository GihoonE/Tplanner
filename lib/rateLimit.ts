// In-memory rate limit store — works per process instance.
// For multi-instance / serverless deployments, replace with a Redis-backed store.
type Window = { wrongAttempts: number; resetAt: number };

const inviteStore = new Map<string, Window>();
const INVITE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const INVITE_MAX_WRONG = 10;

function getOrCreate(key: string): Window {
  const now = Date.now();
  const existing = inviteStore.get(key);
  if (!existing || now >= existing.resetAt) {
    const w: Window = { wrongAttempts: 0, resetAt: now + INVITE_WINDOW_MS };
    inviteStore.set(key, w);
    return w;
  }
  return existing;
}

export function isInviteRateLimited(userId: string): boolean {
  return getOrCreate(userId).wrongAttempts >= INVITE_MAX_WRONG;
}

export function recordWrongInviteAttempt(userId: string): void {
  getOrCreate(userId).wrongAttempts += 1;
}
