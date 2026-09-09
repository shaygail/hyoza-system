export type MentionUser = { id: string; name: string; email: string };

export function nameParts(user: MentionUser): { full: string; first: string; last: string } {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  return {
    full: parts.join(" "),
    first: parts[0] ?? "",
    last: parts.slice(1).join(" "),
  };
}

/** Display label for chips / timeline — first + last name. */
export function mentionHandle(user: MentionUser, _peers?: MentionUser[]): string {
  const { full } = nameParts(user);
  return full || user.email.split("@")[0] || user.id.slice(0, 8);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Active @query at caret (query is text after @ until whitespace). */
export function getActiveMention(
  value: string,
  caret: number
): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const match = before.match(/(^|[\s([{])@([^\s@]*)$/);
  if (!match) return null;
  const atIndex = before.lastIndexOf("@");
  return { start: atIndex, query: match[2] ?? "" };
}

export function filterMentionUsers(users: MentionUser[], query: string): MentionUser[] {
  const q = query.toLowerCase();
  return users.filter((u) => {
    const { full, first, last } = nameParts(u);
    return (
      full.toLowerCase().includes(q) ||
      first.toLowerCase().includes(q) ||
      last.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });
}

function mentionAppearsInBody(body: string, label: string): boolean {
  if (!label) return false;
  const re = new RegExp(`@${escapeRegExp(label)}(?=$|[\\s.,!?;:)'"\\]])`, "i");
  return re.test(body);
}

/**
 * Resolve @mentions in text to user ids.
 * Matches `@First Last` first, then `@First` when that first name is unique
 * (so deleting the last name still keeps the tag).
 */
export function resolveMentionedUserIds(body: string, users: MentionUser[]): string[] {
  const ids = new Set<string>();
  const sorted = [...users].sort((a, b) => nameParts(b).full.length - nameParts(a).full.length);

  for (const user of sorted) {
    const { full, first } = nameParts(user);
    if (mentionAppearsInBody(body, full)) {
      ids.add(user.id);
      continue;
    }
    if (!first) continue;
    const sameFirst = users.filter(
      (u) => nameParts(u).first.toLowerCase() === first.toLowerCase()
    );
    if (sameFirst.length === 1 && mentionAppearsInBody(body, first)) {
      ids.add(user.id);
    }
  }

  return [...ids];
}

/** Insert `@First Last ` at the active mention. */
export function insertMention(
  value: string,
  caret: number,
  mentionStart: number,
  user: MentionUser,
  _peers?: MentionUser[]
): { value: string; caret: number; handle: string } {
  const handle = mentionHandle(user);
  const before = value.slice(0, mentionStart);
  const after = value.slice(caret);
  const inserted = `@${handle} `;
  return {
    value: `${before}${inserted}${after}`,
    caret: before.length + inserted.length,
    handle,
  };
}

/** Remove full-name and first-name forms of a mention from the body. */
export function stripMentionFromBody(body: string, user: MentionUser): string {
  const { full, first } = nameParts(user);
  let next = body;
  if (full) {
    next = next.replace(new RegExp(`@${escapeRegExp(full)}(?=$|[\\s.,!?;:)'"\\]])`, "gi"), "");
  }
  if (first && first.toLowerCase() !== full.toLowerCase()) {
    next = next.replace(new RegExp(`@${escapeRegExp(first)}(?=$|[\\s.,!?;:)'"\\]])`, "gi"), "");
  } else if (first) {
    next = next.replace(new RegExp(`@${escapeRegExp(first)}(?=$|[\\s.,!?;:)'"\\]])`, "gi"), "");
  }
  return next.replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").trimStart();
}

/** True when the in-progress @query is already a completed mention for a tagged user. */
export function isCompletedMentionQuery(
  query: string,
  mentionedIds: string[],
  users: MentionUser[]
): boolean {
  const q = query.toLowerCase();
  if (!q) return false;
  return mentionedIds.some((id) => {
    const user = users.find((u) => u.id === id);
    if (!user) return false;
    const { full, first } = nameParts(user);
    return q === full.toLowerCase() || q === first.toLowerCase();
  });
}
