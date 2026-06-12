import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard
      title="Choose a new password"
      description="Your new password must contain at least 12 characters."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="error text-sm">The reset token is missing.</p>
      )}
    </AuthCard>
  );
}
