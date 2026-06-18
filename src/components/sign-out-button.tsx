"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton({
  className = "icon-button header-sign-out",
  label,
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      aria-label="Sign out"
      className={className}
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      title="Sign out"
      type="button"
    >
      <LogOut size={16} />
      {label ? <span>{label}</span> : null}
    </button>
  );
}
