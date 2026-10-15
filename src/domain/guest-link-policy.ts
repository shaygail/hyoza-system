/** Lifetime rules for passwordless customer ticket links. Pure — unit-testable. */

const DEFAULT_TTL_DAYS = 30;

export function guestLinkTtlDays() {
  const n = Number(process.env.GUEST_LINK_TTL_DAYS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_DAYS;
}

export function guestLinkExpiry(from: Date = new Date(), ttlDays = guestLinkTtlDays()) {
  return new Date(from.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

export interface GuestAccessLike {
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

/**
 * A link is valid until revoked or expired. Links created before expiry was introduced
 * (expiresAt = null) expire TTL days after creation instead of living forever.
 */
export function isGuestAccessValid(
  access: GuestAccessLike,
  now: Date = new Date(),
  ttlDays = guestLinkTtlDays()
) {
  if (access.revokedAt) return false;
  const expiresAt = access.expiresAt ?? guestLinkExpiry(access.createdAt, ttlDays);
  return expiresAt.getTime() > now.getTime();
}
