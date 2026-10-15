/**
 * Background worker: fetches mail over IMAP, turns it into tickets/replies, and runs
 * SLA escalations.
 *
 *   npm run email:worker            # one pass, then exit (cron / scheduled task)
 *   npm run worker                  # run continuously (systemd, Docker, PM2)
 *
 * Continuous mode env: WORKER_INTERVAL_SECONDS (default 60).
 */
import { processPendingEmails } from "../src/domain/email-to-ticket";
import { fetchImapMail, isImapConfigured } from "../src/domain/imap-fetch";
import { checkSlaEscalations } from "../src/domain/sla-engine";
import { prisma } from "../src/lib/prisma";

const watch = process.argv.includes("--watch");
const intervalMs = Math.max(15, Number(process.env.WORKER_INTERVAL_SECONDS ?? 60)) * 1000;

function log(message: string, ...rest: unknown[]) {
  console.log(`[worker ${new Date().toISOString()}] ${message}`, ...rest);
}

async function runOnce() {
  if (isImapConfigured()) {
    try {
      const fetched = await fetchImapMail();
      if (fetched.fetched > 0) log(`Fetched ${fetched.fetched} message(s) via IMAP`, fetched.results);
    } catch (err) {
      log("IMAP fetch failed:", (err as Error).message);
    }
  }

  // Retry anything still pending (e.g. stored by the simulate endpoint or a previous crash).
  const emailResults = await processPendingEmails();
  if (emailResults.length > 0) log(`Processed ${emailResults.length} pending email(s)`, emailResults);

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  for (const tenant of tenants) {
    const escalated = await checkSlaEscalations(tenant.id);
    if (escalated.length > 0) log(`SLA escalations for ${tenant.name}: ${escalated.length}`);
  }
}

let stopping = false;
let wake: (() => void) | null = null;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    log(`${sig} received, finishing current pass…`);
    stopping = true;
    wake?.();
  });
}

async function main() {
  if (!isImapConfigured()) log("IMAP not configured (IMAP_HOST/IMAP_USER) — skipping mailbox fetch");

  if (!watch) {
    await runOnce();
    log("Worker completed.");
    return;
  }

  log(`Running continuously every ${intervalMs / 1000}s`);
  while (!stopping) {
    const started = Date.now();
    try {
      await runOnce();
    } catch (err) {
      // Keep the loop alive on transient errors (DB restart, network blip).
      log("Pass failed:", err);
    }
    const wait = Math.max(0, intervalMs - (Date.now() - started));
    await new Promise<void>((resolve) => {
      wake = resolve;
      setTimeout(resolve, wait);
    });
  }
  log("Stopped.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
