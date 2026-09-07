import { prisma } from "@/lib/prisma";

// Re-export contract domain as the agreements module for backward compatibility.
export {
  listServiceAgreements,
  createServiceAgreement,
  getOrganisationTimeUsage,
  getActiveContractForOrganisation as getServiceAgreementForOrganisation,
} from "@/domain/contracts";
