"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Home,
  LayoutList,
  UserCircle,
  X,
} from "lucide-react";

const baseTourSteps = [
  {
    title: "Start at your portal home",
    description:
      "The home screen gives you a quick read on recent portal activity and the shared workspaces available to you.",
    selector: '[data-tour-target="client-home"]',
    icon: Home,
  },
  {
    title: "Open shared views",
    description:
      "Shared views are the records your team has made available. Each view can have its own icon, color, records, reports, files, and notes.",
    selector: '[data-tour-target="client-shared-views"]',
    icon: Compass,
  },
  {
    title: "Work from the record table",
    description:
      "Use the table to sort, filter, favorite, bulk-select, and open detailed records without leaving the portal workspace.",
    selector: '[data-tour-target="client-records-table"]',
    icon: LayoutList,
  },
  {
    title: "Switch between records and reports",
    description:
      "When a view includes reports, use the anchored tabs at the top to move between the record table and dashboard-style reporting.",
    selector: '[data-tour-target="client-view-tabs"]',
    icon: LayoutList,
  },
  {
    title: "Manage your account",
    description:
      "Use the account menu to update your profile, change settings, switch themes, or sign out when you are done.",
    selector: '[data-tour-target="client-account"]',
    icon: UserCircle,
  },
] as const;

export function ClientOnboardingTour({ userKey }: { userKey: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forced = searchParams.get("tour") === "1";
  const storageKey = `client-tour-complete:${userKey.toLowerCase()}`;
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem(storageKey) === "1",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const active = forced || !dismissed;
  const presentSteps =
    typeof document === "undefined"
      ? []
      : baseTourSteps.filter((step) => document.querySelector(step.selector));
  const availableSteps = presentSteps.length ? presentSteps : baseTourSteps;
  const safeStepIndex = Math.min(stepIndex, availableSteps.length - 1);
  const step = availableSteps[safeStepIndex] ?? baseTourSteps[0]!;
  const Icon = step.icon;

  const closeTour = useCallback(() => {
    window.localStorage.setItem(storageKey, "1");
    setDismissed(true);
    setStepIndex(0);
    if (forced) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("tour");
      const nextQuery = nextParams.toString();
      router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, {
        scroll: false,
      });
    }
  }, [forced, pathname, router, searchParams, storageKey]);

  useEffect(() => {
    if (!active) return;

    const backdrop = backdropRef.current;
    const handleWheel = (event: WheelEvent) => {
      if (!event.deltaY || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      const scrollRoot = document.querySelector<HTMLElement>(
        ".portal-shell .app-main, .app-main",
      );
      if (!scrollRoot) return;
      const before = scrollRoot.scrollTop;
      scrollRoot.scrollTop += event.deltaY;
      if (scrollRoot.scrollTop !== before) {
        event.preventDefault();
      }
    };
    backdrop?.addEventListener("wheel", handleWheel, { passive: false });

    const target = document.querySelector<HTMLElement>(step.selector);
    target?.classList.add("admin-tour-highlight");
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    const positionCard = () => {
      const card = dialogRef.current;
      if (!card || !target) return;
      const targetRect = target.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const gap = 16;
      const margin = 16;
      const maxLeft = window.innerWidth - cardRect.width - margin;
      const maxTop = window.innerHeight - cardRect.height - margin;
      const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), Math.max(min, max));
      let left = targetRect.right + gap;
      let top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
      let placement = "right";

      if (left > maxLeft) {
        left = targetRect.left - cardRect.width - gap;
        placement = "left";
      }
      if (left < margin) {
        left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
        top = targetRect.bottom + gap;
        placement = "bottom";
      }
      if (top > maxTop) {
        top = targetRect.top - cardRect.height - gap;
        placement = "top";
      }

      card.style.setProperty(
        "--tour-card-left",
        `${clamp(left, margin, maxLeft)}px`,
      );
      card.style.setProperty(
        "--tour-card-top",
        `${clamp(top, margin, maxTop)}px`,
      );
      card.dataset.placement = placement;
    };

    requestAnimationFrame(positionCard);
    window.addEventListener("resize", positionCard);
    window.addEventListener("scroll", positionCard, true);
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("admin-tour-active");

    return () => {
      backdrop?.removeEventListener("wheel", handleWheel);
      target?.classList.remove("admin-tour-highlight");
      window.removeEventListener("resize", positionCard);
      window.removeEventListener("scroll", positionCard, true);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("admin-tour-active");
    };
  }, [active, closeTour, step.selector]);

  if (!active) return null;

  return (
    <div className="admin-tour-layer client-tour-layer">
      <button
        aria-label="Skip client portal tour"
        className="admin-tour-backdrop client-tour-backdrop"
        onClick={closeTour}
        ref={backdropRef}
        type="button"
      />
      <div
        aria-labelledby="client-tour-title"
        aria-modal="true"
        className="admin-tour-card client-tour-card"
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
          Client tour · {safeStepIndex + 1} of {availableSteps.length}
        </p>
        <h2 id="client-tour-title">{step.title}</h2>
        <p>{step.description}</p>
        <div className="admin-tour-progress" aria-hidden="true">
          {availableSteps.map((item, index) => (
            <span
              className={index <= safeStepIndex ? "is-active" : ""}
              key={item.title}
            />
          ))}
        </div>
        <div className="admin-tour-actions">
          {safeStepIndex > 0 ? (
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
          {safeStepIndex < availableSteps.length - 1 ? (
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
