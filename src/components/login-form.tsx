"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  googleEnabled,
  customProvider,
}: {
  googleEnabled: boolean;
  customProvider: { enabled: boolean; name: string };
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="login-methods">
      {googleEnabled || customProvider.enabled ? (
        <div className="sso-login-options">
          {googleEnabled ? (
            <Button
              className="sso-login-button"
              disabled={pending}
              onClick={async () => {
                setError("");
                setPending(true);
                const result = await authClient.signIn.social({
                  provider: "google",
                  callbackURL: "/",
                  errorCallbackURL: "/login?oauth=error",
                });
                if (result?.error) {
                  setPending(false);
                  setError("Google sign-in could not be started.");
                }
              }}
              type="button"
              variant="outline"
            >
              <span className="google-mark" aria-hidden="true">
                G
              </span>
              Continue with Google
            </Button>
          ) : null}
          {customProvider.enabled ? (
            <Button
              className="sso-login-button"
              disabled={pending}
              onClick={async () => {
                setError("");
                setPending(true);
                const result = await authClient.signIn.oauth2({
                  providerId: "custom-oauth",
                  callbackURL: "/",
                  errorCallbackURL: "/login?oauth=error",
                });
                if (result?.error) {
                  setPending(false);
                  setError(
                    `${customProvider.name} sign-in could not be started.`,
                  );
                }
              }}
              type="button"
              variant="outline"
            >
              {customProvider.name}
            </Button>
          ) : null}
          <div className="login-divider">
            <span>or use email</span>
          </div>
        </div>
      ) : null}
      <form
        className={`login-form ${pending ? "is-signing-in" : ""}`}
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setPending(true);
          const form = new FormData(event.currentTarget);
          const result = await authClient.signIn.email({
            email: String(form.get("email")),
            password: String(form.get("password")),
            rememberMe: false,
          });
          setPending(false);
          if (result.error) {
            setError(
              result.error.code === "INVALID_ORIGIN"
                ? "This portal address is not trusted by the server. Update APP_URL and TRUSTED_ORIGINS, then restart the portal."
                : "The email or password is incorrect.",
            );
            return;
          }
          window.location.assign("/");
        }}
      >
        {error ? <p className="error text-sm">{error}</p> : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button
          className="login-submit"
          disabled={pending}
          loading={pending}
          size="lg"
          type="submit"
        >
          <span className="login-submit-spinner" aria-hidden="true" />
          {pending ? "Signing in..." : "Sign in"}
        </Button>
        <a
          className="text-center text-sm font-semibold text-[#3157d5]"
          href="/forgot-password"
        >
          Forgot password?
        </a>
      </form>
    </div>
  );
}
