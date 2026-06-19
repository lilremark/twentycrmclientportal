"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, X } from "lucide-react";

import { updateUserPortalAccessAction } from "@/app/actions/admin";

type AssignedPortal = {
  portalViewId: string;
  portalLabel: string;
  role: "viewer" | "contributor";
};

type AvailableView = {
  id: string;
  label: string;
};

export function AssignPortals({
  userId,
  userName,
  assignedPortals,
  availableViews,
}: {
  userId: string;
  userName: string;
  assignedPortals: AssignedPortal[];
  availableViews: AvailableView[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(false);
  const [checkedPortals, setCheckedPortals] = useState<
    Map<string, { checked: boolean; role: "viewer" | "contributor" }>
  >(new Map());
  const [pending, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize checklist state when modal opens
  const openModal = () => {
    const initialMap = new Map<string, { checked: boolean; role: "viewer" | "contributor" }>();
    // Pre-populate with currently assigned portals
    for (const portal of assignedPortals) {
      initialMap.set(portal.portalViewId, { checked: true, role: portal.role });
    }
    // Also include any other available portals as unchecked
    for (const view of availableViews) {
      if (!initialMap.has(view.id)) {
        initialMap.set(view.id, { checked: false, role: "viewer" });
      }
    }
    setCheckedPortals(initialMap);
    setConfirmState(false);
    setIsOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setConfirmState(false);
  }, []);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeModal, pending]);

  // Calculate changes (grants and revokes)
  const grants: {
    portalViewId: string;
    role: "viewer" | "contributor";
    portalLabel: string;
    type: "new" | "update";
    oldRole?: "viewer" | "contributor";
  }[] = [];
  const revokes: { portalViewId: string; portalLabel: string }[] = [];

  for (const view of availableViews) {
    const current = checkedPortals.get(view.id) || { checked: false, role: "viewer" as const };
    const initial = assignedPortals.find((p) => p.portalViewId === view.id);

    if (current.checked) {
      if (!initial) {
        grants.push({
          portalViewId: view.id,
          role: current.role,
          portalLabel: view.label,
          type: "new",
        });
      } else if (initial.role !== current.role) {
        grants.push({
          portalViewId: view.id,
          role: current.role,
          portalLabel: view.label,
          type: "update",
          oldRole: initial.role,
        });
      }
    } else {
      if (initial) {
        revokes.push({
          portalViewId: view.id,
          portalLabel: view.label,
        });
      }
    }
  }

  const hasChanges = grants.length > 0 || revokes.length > 0;

  const handleConfirmSubmit = () => {
    startTransition(async () => {
      try {
        const grantsInput = grants.map((g) => ({
          portalViewId: g.portalViewId,
          role: g.role,
        }));
        const revokesInput = revokes.map((r) => r.portalViewId);
        await updateUserPortalAccessAction(userId, grantsInput, revokesInput);
        closeModal();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to update portal assignments.");
      }
    });
  };

  return (
    <>
      <button className="button secondary" onClick={openModal} type="button">
        Assign Portals
      </button>

      {isOpen &&
        createPortal(
          <div className="confirmation-layer">
            <button
              aria-label="Close portal assignment"
              className="confirmation-backdrop"
              disabled={pending}
              onClick={closeModal}
              type="button"
            />
            <div
              aria-describedby="portal-assignment-description"
              aria-labelledby="portal-assignment-title"
              aria-modal="true"
              className="confirmation-card"
              ref={cardRef}
              role="dialog"
              style={{ width: "min(100%, 540px)", outline: "none" }}
              tabIndex={-1}
            >
              <button
                aria-label="Close assignment modal"
                className="icon-button confirmation-close"
                disabled={pending}
                onClick={closeModal}
                type="button"
              >
                <X size={16} />
              </button>

              {!confirmState ? (
                /* Checklist Screen */
                <>
                  <div>
                    <span className="confirmation-icon" aria-hidden="true" style={{ background: "color-mix(in srgb, var(--brand-primary) 12%, var(--surface))", color: "var(--brand-primary)" }}>
                      <ShieldAlert size={20} />
                    </span>
                    <h2 id="portal-assignment-title">Assign portals to {userName}</h2>
                    <p id="portal-assignment-description">
                      Select which portals this user can access and configure their permissions role.
                    </p>
                  </div>

                  <div
                    style={{
                      maxHeight: "320px",
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "8px 14px",
                      background: "color-mix(in srgb, var(--surface) 95%, transparent)",
                    }}
                  >
                    {availableViews.length === 0 ? (
                      <p style={{ textAlign: "center", color: "var(--muted)", paddingBlock: "20px", fontSize: "0.82rem" }}>
                        No enabled portal views are available.
                      </p>
                    ) : (
                      availableViews.map((view) => {
                        const current = checkedPortals.get(view.id) || { checked: false, role: "viewer" as const };
                        return (
                          <div
                            key={view.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingBlock: "10px",
                              borderBottom: "1px solid var(--border)",
                              minHeight: "48px",
                            }}
                          >
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                cursor: "pointer",
                                flex: 1,
                                fontSize: "0.82rem",
                                fontWeight: "600",
                                userSelect: "none",
                              }}
                            >
                              <input
                                checked={current.checked}
                                onChange={(e) => {
                                  setCheckedPortals((prev) => {
                                    const next = new Map(prev);
                                    next.set(view.id, { checked: e.target.checked, role: current.role });
                                    return next;
                                  });
                                }}
                                type="checkbox"
                              />
                              <span>{view.label}</span>
                            </label>
                            <select
                              className="input"
                              disabled={!current.checked}
                              onChange={(e) => {
                                setCheckedPortals((prev) => {
                                  const next = new Map(prev);
                                  next.set(view.id, {
                                    checked: current.checked,
                                    role: e.target.value as "viewer" | "contributor",
                                  });
                                  return next;
                                });
                              }}
                              style={{
                                width: "125px",
                                minHeight: "32px",
                                padding: "4px 8px",
                                fontSize: "0.78rem",
                              }}
                              value={current.role}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="contributor">Contributor</option>
                            </select>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="form-actions">
                    <button className="button secondary" onClick={closeModal} type="button">
                      Cancel
                    </button>
                    <button
                      className="button"
                      disabled={!hasChanges}
                      onClick={() => setConfirmState(true)}
                      type="button"
                    >
                      Apply
                    </button>
                  </div>
                </>
              ) : (
                /* Confirmation Screen */
                <>
                  <div>
                    <span className="confirmation-icon" aria-hidden="true" style={{ background: "color-mix(in srgb, var(--brand-primary) 12%, var(--surface))", color: "var(--brand-primary)" }}>
                      <ShieldAlert size={20} />
                    </span>
                    <h2 id="portal-assignment-title">Confirm portal assignments</h2>
                    <p id="portal-assignment-description">
                      Please review the access modifications for <strong>{userName}</strong> before saving.
                    </p>
                  </div>

                  <div
                    style={{
                      maxHeight: "320px",
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "14px",
                      background: "color-mix(in srgb, var(--surface) 95%, transparent)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {grants.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <h4 style={{ fontWeight: "700", color: "var(--brand-primary)", marginBottom: "6px" }}>
                          Grant Access / Update Role:
                        </h4>
                        <ul style={{ listStyleType: "disc", paddingLeft: "20px", margin: 0 }}>
                          {grants.map((grant) => (
                            <li key={grant.portalViewId} style={{ paddingBlock: "2px" }}>
                              {grant.type === "new" ? (
                                <>
                                  Grant access to <strong>{grant.portalLabel}</strong> as <em>{grant.role}</em>
                                </>
                              ) : (
                                <>
                                  Change <strong>{grant.portalLabel}</strong> role to <em>{grant.role}</em> (was <em>{grant.oldRole}</em>)
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {revokes.length > 0 && (
                      <div>
                        <h4 style={{ fontWeight: "700", color: "var(--danger)", marginBottom: "6px" }}>
                          Revoke Access:
                        </h4>
                        <ul style={{ listStyleType: "disc", paddingLeft: "20px", margin: 0 }}>
                          {revokes.map((revoke) => (
                            <li key={revoke.portalViewId} style={{ paddingBlock: "2px" }}>
                              Revoke access from <strong>{revoke.portalLabel}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      className="button secondary"
                      disabled={pending}
                      onClick={() => setConfirmState(false)}
                      type="button"
                    >
                      Back
                    </button>
                    <button
                      className="button"
                      disabled={pending}
                      onClick={handleConfirmSubmit}
                      type="button"
                    >
                      {pending ? "Saving..." : "Confirm & Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
