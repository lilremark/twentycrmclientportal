import { redirect } from "next/navigation";

export default function ClientsRedirectPage() {
  redirect("/admin/invitations/clients");
}
