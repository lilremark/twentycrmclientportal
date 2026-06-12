"use client";

import { useActionState, useState, useTransition } from "react";

import {
  createInvitationAction,
  testConnectionAction,
} from "@/app/actions/admin";

export function ConnectionTestButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  }>();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="button secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => setResult(await testConnectionAction()))
        }
        type="button"
      >
        {pending ? "Testing…" : "Test connection"}
      </button>
      {result ? (
        <span className={result.ok ? "success text-sm" : "error text-sm"}>
          {result.message}
        </span>
      ) : null}
    </div>
  );
}

export function InvitationForm({
  clients,
}: {
  clients: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(createInvitationAction, {
    error: undefined,
    inviteUrl: undefined,
  });
  return (
    <form action={action} className="card grid gap-4 p-5">
      <h2 className="text-lg font-bold">Invite user</h2>
      {state.error ? <p className="error text-sm">{state.error}</p> : null}
      {state.inviteUrl ? (
        <p className="success break-all text-sm">
          Invitation created: {state.inviteUrl}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input className="input" id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select className="input" id="role" name="role">
            <option value="viewer">Viewer</option>
            <option value="contributor">Contributor</option>
            <option value="admin">Portal administrator</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="clientAccountId">Client account</label>
          <select className="input" id="clientAccountId" name="clientAccountId">
            <option value="">Not applicable</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="button w-fit" disabled={pending} type="submit">
        {pending ? "Creating…" : "Create invitation"}
      </button>
    </form>
  );
}
