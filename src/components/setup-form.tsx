"use client";

import { useActionState } from "react";

import { setupAction } from "@/app/actions/auth";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, {
    error: undefined,
  });
  return (
    <form action={action} className="setup-workflow-form" encType="multipart/form-data">
      {state.error ? <p className="error text-sm">{state.error}</p> : null}
      <section className="setup-step">
        <span>1</span>
        <div>
          <h2>Administrator</h2>
          <div className="grid gap-4">
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
          </div>
        </div>
      </section>
      <section className="setup-step">
        <span>2</span>
        <div>
          <h2>Twenty CRM</h2>
          <div className="grid gap-4">
            <div className="field">
              <label htmlFor="twentyBaseUrl">Twenty base URL</label>
              <input className="input" id="twentyBaseUrl" name="twentyBaseUrl" placeholder="https://crm.example.com" type="text" />
            </div>
            <label className="settings-toggle">
              <input defaultChecked name="twentyAutoFormatUrl" type="checkbox" />
              <span>Automatically format Twenty API endpoints</span>
            </label>
            <div className="field">
              <label htmlFor="twentyApiKey">Twenty API key</label>
              <input className="input" id="twentyApiKey" name="twentyApiKey" type="password" />
            </div>
            <div className="field">
              <label htmlFor="twentyWebhookSecret">Webhook secret</label>
              <input className="input" id="twentyWebhookSecret" name="twentyWebhookSecret" type="password" />
            </div>
          </div>
        </div>
      </section>
      <section className="setup-step">
        <span>3</span>
        <div>
          <h2>SMTP email</h2>
          <div className="grid gap-4">
            <div className="field">
              <label htmlFor="smtpHost">SMTP host</label>
              <input className="input" id="smtpHost" name="smtpHost" />
            </div>
            <div className="field">
              <label htmlFor="smtpPort">SMTP port</label>
              <input className="input" defaultValue="587" id="smtpPort" name="smtpPort" type="number" />
            </div>
            <label className="settings-toggle">
              <input name="smtpSecure" type="checkbox" />
              <span>Use TLS/SSL</span>
            </label>
            <div className="field">
              <label htmlFor="smtpUser">SMTP username</label>
              <input className="input" id="smtpUser" name="smtpUser" />
            </div>
            <div className="field">
              <label htmlFor="smtpPassword">SMTP password</label>
              <input className="input" id="smtpPassword" name="smtpPassword" type="password" />
            </div>
            <div className="field">
              <label htmlFor="smtpFrom">From address</label>
              <input className="input" id="smtpFrom" name="smtpFrom" placeholder="Twenty Portal <portal@example.com>" />
            </div>
          </div>
        </div>
      </section>
      <section className="setup-step">
        <span>4</span>
        <div>
          <h2>Branding</h2>
          <div className="grid gap-4">
            <div className="field">
              <label htmlFor="brandName">Application name</label>
              <input className="input" defaultValue="Twenty Portal" id="brandName" name="brandName" required />
            </div>
            <div className="field">
              <label htmlFor="brandLogoFile">Upload logo</label>
              <input accept="image/*" className="input" id="brandLogoFile" name="brandLogoFile" type="file" />
            </div>
            <div className="field">
              <label htmlFor="brandLogoUrl">Logo URL</label>
              <input className="input" id="brandLogoUrl" name="brandLogoUrl" />
            </div>
            <div className="field">
              <label htmlFor="loginBackgroundFile">Sign-in background</label>
              <input accept="image/png" className="input" id="loginBackgroundFile" name="loginBackgroundFile" type="file" />
            </div>
            <div className="field">
              <label htmlFor="loginBackgroundUrl">Background image URL</label>
              <input className="input" id="loginBackgroundUrl" name="loginBackgroundUrl" />
            </div>
            <div className="field">
              <label htmlFor="primaryColor">Primary color</label>
              <input className="input" defaultValue="#3157d5" id="primaryColor" name="primaryColor" type="color" />
            </div>
            <div className="field">
              <label htmlFor="portalTitle">Portal heading</label>
              <input className="input" defaultValue="Client portal" id="portalTitle" name="portalTitle" required />
            </div>
            <div className="field">
              <label htmlFor="portalDescription">Welcome message</label>
              <textarea className="input" defaultValue="Secure access to the records shared with your team." id="portalDescription" name="portalDescription" required />
            </div>
            <div className="field">
              <label htmlFor="supportEmail">Support email</label>
              <input className="input" id="supportEmail" name="supportEmail" type="email" />
            </div>
          </div>
        </div>
      </section>
      <button className="button mt-2" disabled={pending} type="submit">
        {pending ? "Creating administrator…" : "Complete setup"}
      </button>
    </form>
  );
}
