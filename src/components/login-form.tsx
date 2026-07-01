"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function LoginForm({
  googleEnabled,
  customProvider,
}: {
  googleEnabled: boolean;
  customProvider: { enabled: boolean; name: string };
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-methods">
      {(googleEnabled || customProvider.enabled) ? (
        <div className="sso-login-options">
          {googleEnabled ? (
            <button
              className="button secondary sso-login-button"
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
            >
              <span className="google-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
          ) : null}
          {customProvider.enabled ? (
            <button
              className="button secondary sso-login-button"
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
                  setError(`${customProvider.name} sign-in could not be started.`);
                }
              }}
              type="button"
            >
              {customProvider.name}
            </button>
          ) : null}
          <div className="login-divider"><span>or use email</span></div>
        </div>
      ) : null}
      <form
        className="login-form"
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
          <input className="input" id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-field-control">
            <input
              autoComplete="current-password"
              className="input"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="password-reveal-button"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </div>
        </div>
        <button aria-busy={pending} className="button login-submit" disabled={pending} type="submit">
          {pending ? (
            <>
              <span className="login-submit-spinner" aria-hidden="true" />
              <span className="sr-only" role="status">Signing in...</span>
            </>
          ) : "Sign in"}
        </button>
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
