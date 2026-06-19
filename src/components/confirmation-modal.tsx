"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmationModal({
  children,
  description,
  onClose,
  title,
}: {
  children: React.ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="confirmation-layer">
      <button
        aria-label="Close confirmation"
        className="confirmation-backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-describedby="confirmation-description"
        aria-labelledby="confirmation-title"
        aria-modal="true"
        className="confirmation-card"
        ref={cardRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close confirmation"
          className="icon-button confirmation-close"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
        <span className="confirmation-icon" aria-hidden="true">
          <AlertTriangle size={20} />
        </span>
        <div>
          <p className="eyebrow">Confirm deletion</p>
          <h2 id="confirmation-title">{title}</h2>
          <p id="confirmation-description">{description}</p>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
