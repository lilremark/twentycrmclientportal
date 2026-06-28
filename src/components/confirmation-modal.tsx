"use client";

import { AlertTriangle, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <AlertDialogPopup className="confirmation-card">
        <Button
          aria-label="Close confirmation"
          className="confirmation-close"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X size={16} />
        </Button>
        <AlertDialogHeader className="confirmation-heading">
          <span className="confirmation-icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <div>
            <p className="eyebrow">Confirm deletion</p>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <div className="confirmation-content">{children}</div>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
