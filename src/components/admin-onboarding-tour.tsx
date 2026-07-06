"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  LayoutDashboard,
  Settings,
  UsersRound,
  X,
} from "lucide-react";

const tourSteps = [
  {
    title: "Start from the overview",
    description:
      "Use the administration dashboard to monitor portal activity, connected CRM objects, and anything that needs attention.",
    selector: '[data-tour-target="overview"]',
    icon: LayoutDashboard,
  },
  {
    title: "Shape the client experience",
    description:
      "Portal views control which Twenty records, fields, reports, icons, and colors each client can access.",
    selector: '[data-tour-target="views"]',
    icon: Compass,
  },
  {
    title: "Invite the right people",
    description:
      "Create client accounts and invitations, then assign access only to the portals each person needs.",
    selector: '[data-tour-target="invitations"]',
    icon: UsersRound,
  },
  {
    title: "Finish in Settings",
    description:
      "Brand the portal, connect Twenty and email, review audit events, and check deployment health from one place.",
    selector: '[data-tour-target="settings"]',
    icon: Settings,
  },
] as const;

export function AdminOnboardingTour() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const step = tourSteps[stepIndex];
  const Icon = step.icon;

  const closeTour = useCallback(() => {
    window.sessionStorage.removeItem("admin-tour-pending");
    router.replace("/admin", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (window.sessionStorage.getItem("admin-tour-pending") !== "1") {
      closeTour();
      return;
    }

    const target = document.querySelector<HTMLElement>(step.selector);
    target?.classList.add("admin-tour-highlight");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("admin-tour-active");

    return () => {
      target?.classList.remove("admin-tour-highlight");
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("admin-tour-active");
    };
  }, [closeTour, step.selector]);

  return (
    <div className="admin-tour-layer">
      <button
        aria-label="Skip administrator tour"
        className="admin-tour-backdrop"
        onClick={closeTour}
        type="button"
      />
      <div
        aria-labelledby="admin-tour-title"
        aria-modal="true"
        className="admin-tour-card"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="admin-tour-heading">
          <span className="admin-tour-icon">
            <Icon size={18} />
          </span>
          <button
            aria-label="Close tour"
            className="icon-button"
            onClick={closeTour}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <p className="eyebrow">
          Quick tour · {stepIndex + 1} of {tourSteps.length}
        </p>
        <h2 id="admin-tour-title">{step.title}</h2>
        <p>{step.description}</p>
        <div className="admin-tour-progress" aria-hidden="true">
          {tourSteps.map((item, index) => (
            <span className={index <= stepIndex ? "is-active" : ""} key={item.title} />
          ))}
        </div>
        <div className="admin-tour-actions">
          {stepIndex > 0 ? (
            <button
              className="button secondary"
              onClick={() => setStepIndex((index) => index - 1)}
              type="button"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <button className="button secondary" onClick={closeTour} type="button">
              Skip tour
            </button>
          )}
          {stepIndex < tourSteps.length - 1 ? (
            <button
              className="button"
              onClick={() => setStepIndex((index) => index + 1)}
              type="button"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button className="button" onClick={closeTour} type="button">
              Finish
              <Check size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
