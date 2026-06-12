import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      description="Enter your email address and we will send a time-limited reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
