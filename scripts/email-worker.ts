import { processPendingEmails } from "../src/domain/email-to-ticket";
import { checkSlaEscalations } from "../src/domain/sla-engine";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Processing pending inbound emails...");
  const emailResults = await processPendingEmails();
  console.log(`Processed ${emailResults.length} emails:`, emailResults);

  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    const escalated = await checkSlaEscalations(tenant.id);
    if (escalated.length > 0) {
      console.log(`SLA escalations for ${tenant.name}:`, escalated.length);
    }
  }

  console.log("Worker completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
