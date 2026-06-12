import { AuthCard } from "@/components/auth-card";
import { InvitationAcceptForm } from "@/components/invitation-accept-form";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthCard
      title="Accept invitation"
      description="Create a password to activate your portal account."
    >
      <InvitationAcceptForm token={token} />
    </AuthCard>
  );
}
