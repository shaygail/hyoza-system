import { describe, expect, it } from "vitest";
import { guestLinkExpiry, isGuestAccessValid } from "@/domain/guest-link-policy";

const now = new Date("2026-10-16T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

describe("isGuestAccessValid", () => {
  it("accepts a link before its expiry", () => {
    const access = { createdAt: daysAgo(1), expiresAt: guestLinkExpiry(daysAgo(1), 30), revokedAt: null };
    expect(isGuestAccessValid(access, now, 30)).toBe(true);
  });

  it("rejects an expired link", () => {
    const access = { createdAt: daysAgo(40), expiresAt: guestLinkExpiry(daysAgo(40), 30), revokedAt: null };
    expect(isGuestAccessValid(access, now, 30)).toBe(false);
  });

  it("rejects a revoked link even if not expired", () => {
    const access = { createdAt: daysAgo(1), expiresAt: guestLinkExpiry(now, 30), revokedAt: daysAgo(0) };
    expect(isGuestAccessValid(access, now, 30)).toBe(false);
  });

  it("expires legacy links (no expiresAt) TTL days after creation", () => {
    expect(isGuestAccessValid({ createdAt: daysAgo(10), expiresAt: null, revokedAt: null }, now, 30)).toBe(true);
    expect(isGuestAccessValid({ createdAt: daysAgo(31), expiresAt: null, revokedAt: null }, now, 30)).toBe(false);
  });
});
