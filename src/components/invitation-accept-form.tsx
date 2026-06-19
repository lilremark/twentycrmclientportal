"use client";

import { useState } from "react";

import { acceptInvitationAction } from "@/app/actions/auth";
import { authClient } from "@/lib/auth-client";

export function InvitationAcceptForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);
        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password"));
        const result = await acceptInvitationAction(
          token,
          {},
          formData,
        );
        if (result.error || !result.acceptedEmail) {
          setError(result.error ?? "Invitation acceptance failed.");
          setPending(false);
          return;
        }

        await authClient.signOut();
        const signIn = await authClient.signIn.email({
          email: result.acceptedEmail,
          password,
          rememberMe: false,
        });
        if (signIn.error) {
          setError(
            "Your account was created, but automatic sign-in failed. Sign in with your new credentials.",
          );
          setPending(false);
          return;
        }
        window.location.assign("/");
      }}
    >
      {error ? <p className="error text-sm">{error}</p> : null}
      <div className="field">
        <label htmlFor="password">Create password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={12}
          required
        />
      </div>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Creating account…" : "Accept invitation"}
      </button>
    </form>
  );
}
