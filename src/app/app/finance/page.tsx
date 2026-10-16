import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getReadyToBill } from "@/domain/finance";
import { PageHeader } from "@/components/ui/page-header";
import { BillingReviewClient } from "@/components/finance/billing-review";

export default async function BillingReviewPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [review, canEdit] = await Promise.all([
    getReadyToBill(session.user.tenantId),
    hasPermission(session.user.id, "billing.edit"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing review"
        projectCrumbs={false}
        breadcrumbs={[{ label: "Finance", href: "/app/finance" }]}
        description="Approved, billable work that hasn't been invoiced yet. Write off what shouldn't be charged, then create draft invoices."
      />
      <BillingReviewClient groups={review.groups} awaitingApproval={review.awaitingApproval} canEdit={canEdit} />
    </div>
  );
}
