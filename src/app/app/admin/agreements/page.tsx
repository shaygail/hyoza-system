import { redirect } from "next/navigation";

/** Legacy agreements route — contracts replaced service agreements. */
export default function AdminAgreementsRedirect() {
  redirect("/app/admin/contracts");
}
