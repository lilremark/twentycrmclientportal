"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      aria-label="Sign out"
      className="icon-button header-sign-out"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      title="Sign out"
      type="button"
    >
      <LogOut size={16} />
    </button>
  );
}
