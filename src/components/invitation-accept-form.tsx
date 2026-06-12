"use client";

import { useActionState } from "react";

import { acceptInvitationAction } from "@/app/actions/auth";

export function InvitationAcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    acceptInvitationAction.bind(null, token),
    { error: undefined },
  );
  return (
    <form action={action} className="grid gap-4">
      {state.error ? <p className="error text-sm">{state.error}</p> : null}
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
