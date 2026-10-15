import { prisma } from "@/lib/prisma";
import { ingestInboundEmail } from "@/domain/email-to-ticket";
import { isAutomatedEmail } from "@/domain/email-threading";

/**
 * Pull unread mail from an IMAP inbox and feed it into email-to-ticket.
 *
 * One IMAP account can serve several EmailMailbox rows: each message is routed to the
 * active mailbox whose address appears in To / Cc / Delivered-To (aliases, shared
 * mailboxes, plus-addressing). Unmatched mail goes to the mailbox for IMAP_USER, or
 * the one named by IMAP_DEFAULT_MAILBOX.
 *
 * Env: IMAP_HOST, IMAP_PORT (993), IMAP_SECURE ("false" to disable TLS), IMAP_USER,
 *      IMAP_PASSWORD, IMAP_FOLDER (INBOX), IMAP_DEFAULT_MAILBOX (email address)
 *
 * Messages are marked \Seen only after they are stored, so a crash mid-run is safe;
 * InboundEmail's (mailboxId, messageId) unique key de-duplicates any re-fetch.
 */

export function isImapConfigured() {
  return Boolean(process.env.IMAP_HOST && process.env.IMAP_USER);
}

function normalize(addr: string) {
  return addr.trim().toLowerCase().replace(/\+[^@]*@/, "@");
}

export async function fetchImapMail(limit = 50) {
  if (!isImapConfigured()) return { fetched: 0, skipped: true as const };

  const [{ ImapFlow }, { simpleParser }] = await Promise.all([
    import("imapflow"),
    import("mailparser"),
  ]);

  const mailboxes = await prisma.emailMailbox.findMany({ where: { isActive: true } });
  const byAddress = new Map(mailboxes.map((m) => [normalize(m.emailAddress), m]));
  const defaultAddr = normalize(process.env.IMAP_DEFAULT_MAILBOX ?? process.env.IMAP_USER ?? "");
  const fallback = byAddress.get(defaultAddr) ?? null;

  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: process.env.IMAP_SECURE !== "false",
    auth: { user: process.env.IMAP_USER!, pass: process.env.IMAP_PASSWORD ?? "" },
    logger: false,
  });

  const results: { uid: number; ok: boolean; ticketId?: string | null; error?: string }[] = [];
  await client.connect();
  const lock = await client.getMailboxLock(process.env.IMAP_FOLDER ?? "INBOX");
  try {
    const uids = ((await client.search({ seen: false }, { uid: true })) || []).slice(0, limit);
    for (const uid of uids) {
      try {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);

        const recipients = [parsed.to, parsed.cc]
          .flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
          .flatMap((a) => a.value.map((x) => x.address ?? ""));
        const deliveredTo = parsed.headers.get("delivered-to");
        if (typeof deliveredTo === "string") recipients.push(deliveredTo);
        const mailbox =
          recipients.map((r) => byAddress.get(normalize(r))).find(Boolean) ?? fallback;

        if (!mailbox) {
          results.push({ uid, ok: false, error: "No EmailMailbox matches recipients" });
          continue; // leave unread so an admin can add the mailbox and re-run
        }

        const headers: Record<string, string | undefined> = {};
        for (const [key, value] of parsed.headers) {
          if (typeof value === "string") headers[key.toLowerCase()] = value;
        }
        const from = parsed.from?.value[0];
        const fromAddress = (from?.address ?? "").toLowerCase();
        if (!fromAddress) {
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          continue;
        }

        const result = await ingestInboundEmail(mailbox.id, {
          messageId: parsed.messageId ?? `imap-${uid}-${parsed.date?.getTime() ?? Date.now()}`,
          fromAddress,
          fromName: from?.name || undefined,
          subject: parsed.subject ?? "",
          body: parsed.text ?? (typeof parsed.html === "string" ? stripHtml(parsed.html) : ""),
          isAutomated: isAutomatedEmail(headers, fromAddress),
        });
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
        results.push({ uid, ok: true, ticketId: result.ticket?.id ?? null });
      } catch (err) {
        results.push({ uid, ok: false, error: (err as Error).message });
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return { fetched: results.length, results };
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
