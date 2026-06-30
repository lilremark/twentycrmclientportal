"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore, type ReactNode } from "react";

export function PortalHeaderActions({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  const target = document.getElementById("portal-section-actions");
  return target ? createPortal(children, target) : null;
}
