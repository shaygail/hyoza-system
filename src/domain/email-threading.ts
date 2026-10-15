/**
 * Pure helpers for threading inbound email onto existing tickets.
 * No database access — unit-testable.
 */

/**
 * Find a ticket reference like "[OCSD-1234]" in a subject line. Bracketed tags are
 * preferred because we put them there ourselves; a bare "OCSD-1234" is accepted as a
 * fallback only when it matches one of the known prefixes.
 */
export function extractTicketNumber(subject: string, knownPrefixes: string[] = []): string | null {
  const bracketed = subject.match(/\[([A-Z][A-Z0-9]{1,15}-\d{1,9})\]/i);
  if (bracketed) return bracketed[1].toUpperCase();

  for (const prefix of knownPrefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bare = subject.match(new RegExp(`\\b(${escaped}-\\d{1,9})\\b`, "i"));
    if (bare) return bare[1].toUpperCase();
  }
  return null;
}

/** Strip common reply/forward prefixes ("Re:", "RE: FW:", "AW:", "SV:") from a subject. */
export function normalizeSubject(subject: string): string {
  return subject.replace(/^\s*((re|fw|fwd|aw|sv|vs|antw)\s*(\[\d+\])?\s*:\s*)+/i, "").trim();
}

const QUOTE_MARKERS: RegExp[] = [
  /^-{2,}\s*original message\s*-{2,}/im,
  /^_{5,}\s*$/m, // Outlook separator
  /^from:\s.+$\n^(sent|date):\s.+$/im, // Outlook header block
  /^on .{5,200}wrote:\s*$/im, // Gmail / Apple Mail
  /^reply above this line/im, // our own marker
];

/**
 * Remove the quoted previous conversation from a reply so the ticket timeline only
 * shows what the customer actually wrote. Falls back to the full body if stripping
 * would leave nothing.
 */
export function stripQuotedReply(body: string): string {
  const text = body.replace(/\r\n/g, "\n");
  let cut = text.length;
  for (const marker of QUOTE_MARKERS) {
    const m = marker.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  let result = text.slice(0, cut);
  // Drop trailing ">" quoted lines.
  result = result
    .split("\n")
    .filter((line) => !/^\s*>/.test(line))
    .join("\n")
    .trim();
  return result.length > 0 ? result : text.trim();
}

/**
 * True for out-of-office replies, bounces and other automated mail that must not
 * create tickets or comments (prevents mail loops). Pass lower-cased header names.
 */
export function isAutomatedEmail(headers: Record<string, string | undefined>, fromAddress: string) {
  const autoSubmitted = headers["auto-submitted"]?.toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (headers["x-autoreply"] || headers["x-autorespond"]) return true;
  if (headers["x-auto-response-suppress"]?.toLowerCase().includes("all")) return true;
  const precedence = headers["precedence"]?.toLowerCase();
  if (precedence && ["bulk", "junk", "list", "auto_reply"].includes(precedence)) return true;
  if (/^(mailer-daemon|postmaster|no-?reply|do-?not-?reply)@/i.test(fromAddress)) return true;
  return false;
}

export function emailDomain(address: string): string | null {
  const at = address.lastIndexOf("@");
  return at >= 0 ? address.slice(at + 1).trim().toLowerCase() : null;
}

/** Free-mail domains that must never be used to match a sender to a client organisation. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.nz",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "xtra.co.nz",
]);
