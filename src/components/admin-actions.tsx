"use client";

import { useActionState, useState, useTransition } from "react";

import {
  createInvitationAction,
  testConnectionAction,
} from "@/app/actions/admin";
import { AppSelect } from "@/components/ui/app-select";

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
  views,
}: {
  clients: Array<{ id: string; name: string; twentyPersonId: string }>;
  views: Array<{ id: string; label: string; scopeMode: string }>;
}) {
  const [role, setRole] = useState("viewer");
  const [state, action, pending] = useActionState(createInvitationAction, {
    error: undefined,
    inviteUrl: undefined,
  });
  return (
    <form action={action} className="card form-card">
      <div>
        <h2 className="text-base font-bold">Invite user</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Assign a portal and role. A client Person is only needed for
          Person-scoped portals.
        </p>
      </div>
      {state.error ? <p className="error text-sm">{state.error}</p> : null}
      {state.inviteUrl ? (
        <p className="success break-all text-sm">
          Invitation created: {state.inviteUrl}
        </p>
      ) : null}
      <div className="form-grid two-column">
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
          <AppSelect
            className="input"
            id="role"
            name="role"
            onChange={(event) => setRole(event.target.value)}
            value={role}
          >
            <option value="viewer">Viewer</option>
            <option value="contributor">Contributor</option>
            <option value="admin">Portal administrator</option>
          </AppSelect>
        </div>
        {role !== "admin" ? (
          <div className="field">
            <label htmlFor="clientAccountId">Client Person (optional)</label>
            <AppSelect
              className="input"
              id="clientAccountId"
              name="clientAccountId"
            >
              <option value="">No Person mapping</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </AppSelect>
            <span className="field-help">
              Required only when the selected portal is scoped to a Twenty
              Person UUID.
            </span>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="portalViewId">Portal access</label>
          <AppSelect className="input" id="portalViewId" name="portalViewId">
            <option value="">Choose a portal</option>
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.label}
              </option>
            ))}
          </AppSelect>
          <span className="field-help">
            All enabled portals are available for invitation.
          </span>
        </div>
      </div>
      <div className="form-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Creating…" : "Create invitation"}
        </button>
      </div>
    </form>
  );
}
