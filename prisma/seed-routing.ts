import { PrismaClient } from "@prisma/client";
import { ensureRoutingTeamsAndCategories } from "../src/domain/routing";

const prisma = new PrismaClient();

export async function seedRouting() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    await ensureRoutingTeamsAndCategories(tenant.id);
  }
  console.log("Routing teams and categories ensured.");
}

if (require.main === module) {
  seedRouting()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
