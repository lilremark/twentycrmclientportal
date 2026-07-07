"use client";

import {
  Building2,
  CheckCircle2,
  ClipboardCopy,
  Plus,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import {
  createClientAccountAction,
  createInvitationAction,
  testConnectionAction,
} from "@/app/actions/admin";
import type { InvitationActionState } from "@/app/actions/admin";
import { AppSelect } from "@/components/ui/app-select";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
  onInvited,
  views,
}: {
  clients: Array<{ id: string; name: string; twentyPersonId: string }>;
  onInvited: (inviteUrl: string) => void;
  views: Array<{ id: string; label: string; scopeMode: string }>;
}) {
  const [role, setRole] = useState("viewer");
  const [state, setState] = useState<InvitationActionState>({
    error: undefined,
    inviteUrl: undefined,
  });
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="invite-user-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setState({ error: undefined, inviteUrl: undefined });
        startTransition(async () => {
          const nextState = await createInvitationAction(state, formData);
          if (nextState.inviteUrl) {
            form.reset();
            setRole("viewer");
            onInvited(nextState.inviteUrl);
            return;
          }
          setState(nextState);
        });
      }}
    >
      {state.error ? <p className="error text-sm">{state.error}</p> : null}
      {state.inviteUrl ? (
        <p className="success break-all text-sm">
          Invitation created: {state.inviteUrl}
        </p>
      ) : null}
      <section className="admin-modal-form-section">
        <div className="admin-modal-form-section-heading">
          <span>01</span>
          <div>
            <strong>Identity</strong>
            <p>Who should receive access?</p>
          </div>
        </div>
        <div className="form-grid two-column invite-user-identity-grid">
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
        </div>
      </section>
      <section className="admin-modal-form-section">
        <div className="admin-modal-form-section-heading">
          <span>02</span>
          <div>
            <strong>Portal access</strong>
            <p>Choose the role, portal, and optional Person mapping.</p>
          </div>
        </div>
        <div className="form-grid two-column invite-user-access-grid">
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
          <div className="field invite-user-portal-field">
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
      </section>
      <div className="form-actions">
        <Button loading={pending} type="submit">
          <Send size={16} />
          Create invitation and send invite
        </Button>
      </div>
    </form>
  );
}

function ClientAccountForm({ onCreated }: { onCreated: () => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="client-account-modal-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setError(undefined);
        startTransition(async () => {
          try {
            await createClientAccountAction(formData);
            form.reset();
            onCreated();
          } catch {
            setError(
              "Enter a client name and a valid Twenty Person UUID, then try again.",
            );
          }
        });
      }}
    >
      {error ? (
        <p aria-live="polite" className="error text-sm">
          {error}
        </p>
      ) : null}
      <section className="admin-modal-form-section">
        <div className="admin-modal-form-section-heading">
          <span>01</span>
          <div>
            <strong>Account details</strong>
            <p>Connect this account to its Person record in Twenty CRM.</p>
          </div>
        </div>
        <div className="form-grid client-account-fields">
          <div className="field">
            <label htmlFor="client-account-name">Client name</label>
            <input
              autoFocus
              className="input"
              id="client-account-name"
              name="name"
              placeholder="Northstar Studio"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="client-account-person-id">Twenty Person ID</label>
            <input
              className="input"
              id="client-account-person-id"
              name="twentyPersonId"
              placeholder="00000000-0000-0000-0000-000000000000"
              required
            />
            <span className="field-help">
              Use the UUID from the matching Person record in Twenty.
            </span>
          </div>
        </div>
      </section>
      <div className="form-actions">
        <Button loading={pending} type="submit">
          <Plus size={16} />
          Add client account
        </Button>
      </div>
    </form>
  );
}

export function ClientAccountModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        <Plus size={16} />
        Add client
      </Button>
      {open ? (
        <AlertDialog onOpenChange={setOpen} open>
          <AlertDialogPopup
            bottomStickOnMobile={false}
            className="admin-form-modal client-account-modal"
            viewportClassName="confirmation-viewport"
          >
            <Button
              aria-label="Close client account form"
              className="confirmation-close"
              onClick={() => setOpen(false)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X size={16} />
            </Button>
            <AlertDialogHeader className="admin-form-modal-heading">
              <span className="admin-form-modal-icon">
                <Building2 size={19} />
              </span>
              <div>
                <AlertDialogTitle>Add client account</AlertDialogTitle>
                <AlertDialogDescription>
                  Create an account for Person-scoped portal access.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <div className="admin-form-modal-content">
              <ClientAccountForm onCreated={() => setOpen(false)} />
            </div>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
    </>
  );
}

export function InvitationModal({
  clients,
  views,
}: {
  clients: Array<{ id: string; name: string; twentyPersonId: string }>;
  views: Array<{ id: string; label: string; scopeMode: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string>();
  const [queuedInviteUrl, setQueuedInviteUrl] = useState<string>();
  const [copied, setCopied] = useState(false);
  const closeInviteSuccess = () => {
    setInviteUrl(undefined);
    setQueuedInviteUrl(undefined);
    setCopied(false);
  };

  useEffect(() => {
    if (open || !queuedInviteUrl) return undefined;
    const timeout = window.setTimeout(() => {
      setInviteUrl(queuedInviteUrl);
      setQueuedInviteUrl(undefined);
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [open, queuedInviteUrl]);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        <UserPlus size={16} />
        Invite user
      </Button>
      {open ? (
        <AlertDialog onOpenChange={setOpen} open>
          <AlertDialogPopup
            bottomStickOnMobile={false}
            className="admin-form-modal invite-user-modal"
            viewportClassName="confirmation-viewport"
          >
            <Button
              aria-label="Close invitation"
              className="confirmation-close"
              onClick={() => setOpen(false)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X size={16} />
            </Button>
            <AlertDialogHeader className="admin-form-modal-heading invite-user-modal-heading">
              <span className="admin-form-modal-icon invite-user-modal-icon">
                <UserPlus size={19} />
              </span>
              <div>
                <AlertDialogTitle>Invite user</AlertDialogTitle>
                <AlertDialogDescription>
                  Assign portal access and send the invitation email.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <div className="admin-form-modal-content invite-user-modal-content">
              <InvitationForm
                clients={clients}
                onInvited={(nextInviteUrl) => {
                  setQueuedInviteUrl(nextInviteUrl);
                  setOpen(false);
                  setCopied(false);
                }}
                views={views}
              />
            </div>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
      {inviteUrl ? (
        <AlertDialog
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeInviteSuccess();
          }}
          open
        >
          <AlertDialogPopup
            bottomStickOnMobile={false}
            className="admin-form-modal invite-success-modal"
            viewportClassName="confirmation-viewport"
          >
            <Button
              aria-label="Close invitation confirmation"
              className="confirmation-close"
              onClick={closeInviteSuccess}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X size={16} />
            </Button>
            <AlertDialogHeader className="admin-form-modal-heading invite-user-modal-heading">
              <span className="admin-form-modal-icon invite-success-modal-icon">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <AlertDialogTitle>Invitation sent</AlertDialogTitle>
                <AlertDialogDescription>
                  The invite email was sent. You can also copy the direct invite
                  link below.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <div className="admin-form-modal-content invite-success-modal-content">
              <div className="invite-success-link-card">
                <span>Invite link</span>
                <code>{inviteUrl}</code>
              </div>
              <div className="form-actions">
                <Button
                  onClick={() => {
                    void navigator.clipboard?.writeText(inviteUrl);
                    setCopied(true);
                  }}
                  type="button"
                  variant="secondary"
                >
                  <ClipboardCopy size={16} />
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button onClick={closeInviteSuccess} type="button">
                  Done
                </Button>
              </div>
            </div>
          </AlertDialogPopup>
        </AlertDialog>
      ) : null}
    </>
  );
}
