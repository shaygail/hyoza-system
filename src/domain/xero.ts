import { prisma } from "@/lib/prisma";
import { getPortalBaseUrl } from "@/domain/customer-email";

/**
 * Xero integration (Phase 1.5).
 * OAuth tokens are stored when connected; without real Xero app credentials,
 * connect/sync operate in stub mode (console + DB flags) for local demos.
 */

export async function getXeroConnection(tenantId: string) {
  return prisma.xeroConnection.findUnique({ where: { tenantId } });
}

export async function connectXeroStub(
  tenantId: string,
  data?: { tenantName?: string; xeroTenantId?: string }
) {
  return prisma.xeroConnection.upsert({
    where: { tenantId },
    update: {
      isConnected: true,
      tenantName: data?.tenantName ?? "Demo Xero Org",
      xeroTenantId: data?.xeroTenantId ?? `xero-demo-${tenantId.slice(0, 8)}`,
      accessToken: "stub-access-token",
      refreshToken: "stub-refresh-token",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastSyncedAt: new Date(),
    },
    create: {
      tenantId,
      isConnected: true,
      tenantName: data?.tenantName ?? "Demo Xero Org",
      xeroTenantId: data?.xeroTenantId ?? `xero-demo-${tenantId.slice(0, 8)}`,
      accessToken: "stub-access-token",
      refreshToken: "stub-refresh-token",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastSyncedAt: new Date(),
    },
  });
}

export async function disconnectXero(tenantId: string) {
  return prisma.xeroConnection.upsert({
    where: { tenantId },
    update: {
      isConnected: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    },
    create: { tenantId, isConnected: false },
  });
}

export async function mapOrganisationToXeroContact(
  tenantId: string,
  organisationId: string,
  xeroContactId?: string
) {
  const org = await prisma.organisation.findFirst({ where: { id: organisationId, tenantId } });
  if (!org) throw new Error("Organisation not found");

  const id = xeroContactId ?? `xero-contact-${organisationId.slice(0, 10)}`;
  console.log(`[xero:map] Organisation ${org.name} → Xero Contact ${id}`);

  return prisma.organisation.update({
    where: { id: organisationId },
    data: { xeroContactId: id },
  });
}

export async function pushInvoiceToXero(tenantId: string, invoiceId: string) {
  const connection = await getXeroConnection(tenantId);
  if (!connection?.isConnected) throw new Error("Xero is not connected");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { organisation: true, lines: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "approved") throw new Error("Only approved invoices can be pushed to Xero");

  let org = invoice.organisation;
  if (!org.xeroContactId) {
    org = await mapOrganisationToXeroContact(tenantId, org.id);
  }

  const xeroInvoiceId = invoice.xeroInvoiceId ?? `xero-inv-${invoice.invoiceNumber}`;

  console.log(`[xero:invoice] Push ${invoice.invoiceNumber} → ${xeroInvoiceId}`);
  console.log(`[xero:invoice] Contact: ${org.xeroContactId} (${org.name})`);
  console.log(`[xero:invoice] Total: ${invoice.currency} ${invoice.total}`);
  for (const line of invoice.lines) {
    console.log(`[xero:invoice]  - ${line.description}: ${line.lineTotal}`);
  }

  // When XERO_CLIENT_ID / XERO_CLIENT_SECRET are set, wire real API here.
  const realMode = Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
  if (realMode) {
    console.log(`[xero:invoice] Real OAuth credentials detected — implement API call at ${getPortalBaseUrl()}/api/v1/xero/callback`);
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { xeroInvoiceId },
    include: { organisation: true, lines: true },
  });
}

export function getXeroAuthorizeUrl(tenantId: string) {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = `${getPortalBaseUrl()}/api/v1/xero/callback`;
  if (!clientId) {
    return null;
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.contacts accounting.transactions offline_access",
    state: tenantId,
  });
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}
