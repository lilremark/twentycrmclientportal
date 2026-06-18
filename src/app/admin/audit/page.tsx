import { redirect } from "next/navigation";

export default function AuditRedirectPage() {
  redirect("/admin/settings/audit");
}
