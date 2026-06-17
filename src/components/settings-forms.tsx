"use client";

import { useActionState, useState, useTransition } from "react";
import { Mail, Palette, PlugZap, Save, Send, UserRound } from "lucide-react";

import {
  type SettingsActionState,
  testTwentySettingsAction,
  testSmtpSettingsAction,
  updateApplicationSettingsAction,
  updateSmtpSettingsAction,
  updateTwentySettingsAction,
  updateProfileAction,
} from "@/app/actions/settings";

const initialState: SettingsActionState = {
  status: "idle",
  message: "",
};

function FormMessage({ state }: { state: SettingsActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      aria-live="polite"
      className={`${state.status === "success" ? "success" : "error"} text-sm`}
    >
      {state.message}
    </p>
  );
}

function AvatarPreview({
  name,
  image,
}: {
  name: string;
  image: string;
}) {
  return (
    <div className="settings-avatar" aria-hidden="true">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={image} />
      ) : (
        <span>{name.slice(0, 2).toUpperCase() || "U"}</span>
      )}
    </div>
  );
}

function previewUploadedImage(file: File | undefined, fallback: string) {
  return file ? URL.createObjectURL(file) : fallback;
}

export function ProfileSettingsForm({
  initialName,
  initialImage,
  email,
}: {
  initialName: string;
  initialImage: string | null;
  email: string;
}) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage ?? "");
  const [imageFile, setImageFile] = useState<File>();

  return (
    <form action={action} className="card settings-card" encType="multipart/form-data">
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <UserRound size={19} />
        </span>
        <div>
          <h2>Profile</h2>
          <p>Update how your identity appears throughout the portal.</p>
        </div>
      </div>
      <FormMessage state={state} />
      <div className="profile-editor">
        <AvatarPreview
          image={previewUploadedImage(imageFile, image)}
          name={name}
        />
        <div className="grid flex-1 gap-4">
          <div className="field">
            <label htmlFor="profile-name">Display name</label>
            <input
              className="input"
              id="profile-name"
              maxLength={80}
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-image-file">Upload avatar</label>
            <input
              accept="image/*"
              className="input"
              id="profile-image-file"
              name="imageFile"
              onChange={(event) => setImageFile(event.target.files?.[0])}
              type="file"
            />
            <span className="field-help">
              JPG, PNG, WEBP, GIF, or SVG. Maximum 2 MB.
            </span>
          </div>
          <div className="field">
            <label htmlFor="profile-image">Avatar image URL</label>
            <input
              className="input"
              id="profile-image"
              name="image"
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/avatar.png or /api/uploads/file.png"
              type="text"
              value={image}
            />
            <span className="field-help">
              Use a public HTTPS image URL. Leave blank to use your initials.
            </span>
          </div>
          <div className="field">
            <label>Email address</label>
            <input className="input" disabled value={email} />
            <span className="field-help">
              Email changes are managed by a portal administrator.
            </span>
          </div>
        </div>
      </div>
      <button className="button settings-submit" disabled={pending} type="submit">
        <Save size={17} />
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

export function ApplicationSettingsForm({
  settings,
}: {
  settings: {
    brandName: string;
    brandLogoUrl: string | null;
    primaryColor: string;
    portalTitle: string;
    portalDescription: string;
    supportEmail: string | null;
  };
}) {
  const [state, action, pending] = useActionState(
    updateApplicationSettingsAction,
    initialState,
  );
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [logoFile, setLogoFile] = useState<File>();
  const [logoUrl, setLogoUrl] = useState(settings.brandLogoUrl ?? "");

  return (
    <form action={action} className="card settings-card" encType="multipart/form-data">
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <Palette size={19} />
        </span>
        <div>
          <h2>Brand and portal</h2>
          <p>Control the identity and customer-facing portal copy.</p>
        </div>
      </div>
      <FormMessage state={state} />
      <div className="settings-grid">
        <div className="field">
          <label htmlFor="brand-name">Application name</label>
          <input
            className="input"
            defaultValue={settings.brandName}
            id="brand-name"
            maxLength={80}
            name="brandName"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="brand-logo-file">Upload logo</label>
          <input
            accept="image/*"
            className="input"
            id="brand-logo-file"
            name="brandLogoFile"
            onChange={(event) => setLogoFile(event.target.files?.[0])}
            type="file"
          />
          <span className="field-help">
            This is used in the sidebar and sign-in screens.
          </span>
        </div>
        <div className="field">
          <label htmlFor="brand-logo">Logo URL</label>
          <input
            className="input"
            id="brand-logo"
            name="brandLogoUrl"
            onChange={(event) => setLogoUrl(event.target.value)}
            placeholder="https://example.com/logo.svg or /api/uploads/file.svg"
            type="text"
            value={logoUrl}
          />
        </div>
        {(logoFile || logoUrl) ? (
          <div className="field">
            <label>Logo preview</label>
            <div className="uploaded-logo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={previewUploadedImage(logoFile, logoUrl)} />
            </div>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="primary-color">Primary color</label>
          <div className="color-field">
            <input
              aria-label="Choose primary color"
              name="primaryColor"
              onChange={(event) => setPrimaryColor(event.target.value)}
              type="color"
              value={primaryColor}
            />
            <input
              aria-label="Primary color hex value"
              className="input"
              onChange={(event) => setPrimaryColor(event.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              required
              value={primaryColor}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="support-email">Support email</label>
          <input
            className="input"
            defaultValue={settings.supportEmail ?? ""}
            id="support-email"
            name="supportEmail"
            placeholder="support@example.com"
            type="email"
          />
        </div>
        <div className="field settings-span">
          <label htmlFor="portal-title">Portal heading</label>
          <input
            className="input"
            defaultValue={settings.portalTitle}
            id="portal-title"
            maxLength={100}
            name="portalTitle"
            required
          />
        </div>
        <div className="field settings-span">
          <label htmlFor="portal-description">Portal welcome message</label>
          <textarea
            className="input min-h-24 resize-y"
            defaultValue={settings.portalDescription}
            id="portal-description"
            maxLength={240}
            name="portalDescription"
            required
          />
        </div>
      </div>
      <button className="button settings-submit" disabled={pending} type="submit">
        <Save size={17} />
        {pending ? "Saving..." : "Save application settings"}
      </button>
    </form>
  );
}

export function TwentySettingsForm({
  settings,
}: {
  settings: {
    twentyBaseUrl: string;
    hasTwentyApiKey: boolean;
    hasTwentyWebhookSecret: boolean;
  };
}) {
  const [state, action, pending] = useActionState(
    updateTwentySettingsAction,
    initialState,
  );
  const [testPending, startTest] = useTransition();
  const [testResult, setTestResult] = useState<SettingsActionState>(initialState);

  return (
    <form action={action} className="card settings-card">
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <PlugZap size={19} />
        </span>
        <div>
          <h2>Twenty CRM</h2>
          <p>Configure the workspace API connection used by portal views.</p>
        </div>
      </div>
      <FormMessage state={state} />
      <FormMessage state={testResult} />
      <div className="settings-grid">
        <div className="field settings-span">
          <label htmlFor="twenty-base-url">Twenty base URL</label>
          <input
            className="input"
            defaultValue={settings.twentyBaseUrl}
            id="twenty-base-url"
            name="twentyBaseUrl"
            placeholder="https://crm.example.com"
            type="url"
          />
        </div>
        <div className="field">
          <label htmlFor="twenty-api-key">API key</label>
          <input
            autoComplete="new-password"
            className="input"
            id="twenty-api-key"
            name="twentyApiKey"
            placeholder={settings.hasTwentyApiKey ? "Configured. Enter a new key to replace." : "Twenty API key"}
            type="password"
          />
        </div>
        <div className="field">
          <label htmlFor="twenty-webhook-secret">Webhook secret</label>
          <input
            autoComplete="new-password"
            className="input"
            id="twenty-webhook-secret"
            name="twentyWebhookSecret"
            placeholder={settings.hasTwentyWebhookSecret ? "Configured. Enter a new secret to replace." : "Webhook secret"}
            type="password"
          />
        </div>
      </div>
      <div className="form-actions">
        <button className="button" disabled={pending} type="submit">
          <Save size={17} />
          {pending ? "Saving..." : "Save Twenty settings"}
        </button>
        <button
          className="button secondary"
          disabled={testPending}
          onClick={() =>
            startTest(async () => setTestResult(await testTwentySettingsAction()))
          }
          type="button"
        >
          <PlugZap size={17} />
          {testPending ? "Testing..." : "Test connection"}
        </button>
      </div>
    </form>
  );
}

export function SmtpSettingsForm({
  settings,
}: {
  settings: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    hasSmtpPassword: boolean;
    smtpFrom: string;
  };
}) {
  const [state, action, pending] = useActionState(
    updateSmtpSettingsAction,
    initialState,
  );
  const [testState, testAction, testPending] = useActionState(
    testSmtpSettingsAction,
    initialState,
  );

  return (
    <section className="card settings-card">
      <form action={action}>
        <div className="settings-card-heading">
          <span className="settings-section-icon">
            <Mail size={19} />
          </span>
          <div>
            <h2>SMTP email</h2>
            <p>Configure invitation and password reset delivery.</p>
          </div>
        </div>
        <FormMessage state={state} />
        <div className="settings-grid">
          <div className="field">
            <label htmlFor="smtp-host">Host</label>
            <input
              className="input"
              defaultValue={settings.smtpHost}
              id="smtp-host"
              name="smtpHost"
              placeholder="smtp.example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="smtp-port">Port</label>
            <input
              className="input"
              defaultValue={settings.smtpPort}
              id="smtp-port"
              name="smtpPort"
              type="number"
            />
          </div>
          <label className="settings-toggle">
            <input
              defaultChecked={settings.smtpSecure}
              name="smtpSecure"
              type="checkbox"
            />
            <span>Use TLS/SSL</span>
          </label>
          <div className="field">
            <label htmlFor="smtp-user">Username</label>
            <input
              className="input"
              defaultValue={settings.smtpUser}
              id="smtp-user"
              name="smtpUser"
            />
          </div>
          <div className="field">
            <label htmlFor="smtp-password">Password</label>
            <input
              autoComplete="new-password"
              className="input"
              id="smtp-password"
              name="smtpPassword"
              placeholder={settings.hasSmtpPassword ? "Configured. Enter a new password to replace." : "SMTP password"}
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="smtp-from">From address</label>
            <input
              className="input"
              defaultValue={settings.smtpFrom}
              id="smtp-from"
              name="smtpFrom"
              placeholder="Twenty Portal <portal@example.com>"
            />
          </div>
        </div>
        <button className="button settings-submit" disabled={pending} type="submit">
          <Save size={17} />
          {pending ? "Saving..." : "Save SMTP settings"}
        </button>
      </form>

      <form action={testAction} className="smtp-test-form">
        <FormMessage state={testState} />
        <div className="field">
          <label htmlFor="smtp-test-email">Send test email to</label>
          <input
            className="input"
            id="smtp-test-email"
            name="testEmail"
            placeholder="you@example.com"
            type="email"
            required
          />
        </div>
        <button className="button secondary" disabled={testPending} type="submit">
          <Send size={17} />
          {testPending ? "Sending..." : "Send test email"}
        </button>
      </form>
    </section>
  );
}
