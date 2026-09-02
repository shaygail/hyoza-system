import { prisma } from "@/lib/prisma";

export async function listCustomFields(tenantId: string, entityType = "ticket") {
  return prisma.customFieldDefinition.findMany({
    where: { tenantId, entityType, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createCustomField(
  tenantId: string,
  data: {
    label: string;
    code: string;
    fieldType: string;
    options?: string[];
    isRequired?: boolean;
    entityType?: string;
  }
) {
  return prisma.customFieldDefinition.create({
    data: {
      tenantId,
      label: data.label,
      code: data.code,
      fieldType: data.fieldType,
      options: JSON.stringify(data.options ?? []),
      isRequired: data.isRequired ?? false,
      entityType: data.entityType ?? "ticket",
    },
  });
}

export async function getTicketCustomFieldValues(ticketId: string) {
  return prisma.ticketCustomFieldValue.findMany({
    where: { ticketId },
    include: { field: true },
  });
}

export async function setTicketCustomFieldValues(
  ticketId: string,
  values: Record<string, string>
) {
  for (const [fieldId, value] of Object.entries(values)) {
    await prisma.ticketCustomFieldValue.upsert({
      where: { ticketId_fieldId: { ticketId, fieldId } },
      update: { value },
      create: { ticketId, fieldId, value },
    });
  }
}

export async function validateRequiredCustomFields(
  tenantId: string,
  values: Record<string, string>
) {
  const required = await prisma.customFieldDefinition.findMany({
    where: { tenantId, entityType: "ticket", isRequired: true, isActive: true },
  });

  const missing = required.filter((f) => !values[f.id]?.trim());
  if (missing.length > 0) {
    throw new Error(`Required custom fields missing: ${missing.map((f) => f.label).join(", ")}`);
  }
}
