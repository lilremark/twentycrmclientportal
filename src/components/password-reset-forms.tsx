"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await authClient.requestPasswordReset({
          email: String(form.get("email")),
          redirectTo: "/reset-password",
        });
        setMessage(
          "If that account exists, a password reset email has been sent.",
        );
      }}
    >
      {message ? <p className="success text-sm">{message}</p> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required />
      </div>
      <button className="button" type="submit">
        Send reset link
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const result = await authClient.resetPassword({
          token,
          newPassword: String(form.get("password")),
        });
        if (result.error) {
          setError("The reset link is invalid or expired.");
          return;
        }
        router.push("/login?password=reset");
      }}
    >
      {error ? <p className="error text-sm">{error}</p> : null}
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={12}
          required
        />
      </div>
      <button className="button" type="submit">
        Reset password
      </button>
    </form>
  );
}
