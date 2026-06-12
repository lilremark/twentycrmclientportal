"use client";

import { useActionState } from "react";

import { setupAction } from "@/app/actions/auth";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, {
    error: undefined,
  });
  return (
    <form action={action} className="grid gap-4">
      {state.error ? <p className="error text-sm">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="setupToken">Setup token</label>
        <input className="input" id="setupToken" name="setupToken" required />
      </div>
      <div className="field">
        <label htmlFor="name">Administrator name</label>
        <input className="input" id="name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={12}
          required
        />
        <p className="text-xs text-[#68758a]">
          At least 12 characters with upper/lowercase letters and a number.
        </p>
      </div>
      <button className="button mt-2" disabled={pending} type="submit">
        {pending ? "Creating administrator…" : "Complete setup"}
      </button>
    </form>
  );
}
