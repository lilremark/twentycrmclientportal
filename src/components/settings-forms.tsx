"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Code2,
  Mail,
  Palette,
  PlugZap,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { DeleteUploadButton } from "@/components/delete-upload-button";
import {
  removeBrandLogoAction,
  removeLoginBackgroundAction,
  removeProfileImageAction,
  resetInvitationEmailTemplateAction,
  type SettingsActionState,
  testTwentySettingsAction,
  testSmtpSettingsAction,
  updateApplicationSettingsAction,
  updateInvitationEmailTemplateAction,
  updateSmtpSettingsAction,
  updateSsoSettingsAction,
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

function isLocalUpload(value: string | null) {
  return Boolean(value?.startsWith("/api/uploads/"));
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
  const [storedImage, setStoredImage] = useState(
    isLocalUpload(initialImage) ? initialImage ?? "" : "",
  );
  const [image, setImage] = useState(
    initialImage && !isLocalUpload(initialImage) ? initialImage : "",
  );
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
          image={previewUploadedImage(imageFile, image || storedImage)}
          name={name}
        />
        {storedImage || image || imageFile ? (
          <DeleteUploadButton
            action={removeProfileImageAction}
            confirmMessage="Delete your current profile image?"
            label="Remove image"
            onDeleted={() => {
              setStoredImage("");
              setImage("");
              setImageFile(undefined);
            }}
          />
        ) : null}
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
    loginBackgroundUrl: string | null;
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
  const [storedLogo, setStoredLogo] = useState(
    isLocalUpload(settings.brandLogoUrl) ? settings.brandLogoUrl ?? "" : "",
  );
  const [logoUrl, setLogoUrl] = useState(
    settings.brandLogoUrl && !isLocalUpload(settings.brandLogoUrl)
      ? settings.brandLogoUrl
      : "",
  );
  const [backgroundFile, setBackgroundFile] = useState<File>();
  const [storedBackground, setStoredBackground] = useState(
    isLocalUpload(settings.loginBackgroundUrl)
      ? settings.loginBackgroundUrl ?? ""
      : "",
  );
  const [backgroundUrl, setBackgroundUrl] = useState(
    settings.loginBackgroundUrl &&
      !isLocalUpload(settings.loginBackgroundUrl)
      ? settings.loginBackgroundUrl
      : "",
  );

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
          <label className="settings-file-upload" htmlFor="brand-logo-file">
            <span>Choose logo file</span>
            <input
              accept="image/*"
              id="brand-logo-file"
              name="brandLogoFile"
              onChange={(event) => setLogoFile(event.target.files?.[0])}
              type="file"
            />
          </label>
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
        {(logoFile || logoUrl || storedLogo) ? (
          <div className="field">
            <label>Logo preview</label>
            <div className="uploaded-logo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                src={previewUploadedImage(logoFile, logoUrl || storedLogo)}
              />
            </div>
            <DeleteUploadButton
              action={removeBrandLogoAction}
              confirmMessage="Delete the current brand logo?"
              label="Remove logo"
              onDeleted={() => {
                setStoredLogo("");
                setLogoUrl("");
                setLogoFile(undefined);
              }}
            />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="login-background-file">Sign-in background</label>
          <label
            className="settings-file-upload"
            htmlFor="login-background-file"
          >
            <span>Choose PNG background</span>
            <input
              accept="image/png"
              id="login-background-file"
              name="loginBackgroundFile"
              onChange={(event) =>
                setBackgroundFile(event.target.files?.[0])
              }
              type="file"
            />
          </label>
          <span className="field-help">
            Upload a PNG used behind the sign-in card.
          </span>
        </div>
        <div className="field">
          <label htmlFor="login-background-url">Background image URL</label>
          <input
            className="input"
            id="login-background-url"
            name="loginBackgroundUrl"
            onChange={(event) => setBackgroundUrl(event.target.value)}
            placeholder="https://example.com/background.png"
            value={backgroundUrl}
          />
        </div>
        {(backgroundFile || backgroundUrl || storedBackground) ? (
          <div className="field settings-span">
            <label>Background preview</label>
            <div className="uploaded-background-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                src={previewUploadedImage(
                  backgroundFile,
                  backgroundUrl || storedBackground,
                )}
              />
            </div>
            <DeleteUploadButton
              action={removeLoginBackgroundAction}
              confirmMessage="Delete the current sign-in background?"
              label="Remove background"
              onDeleted={() => {
                setStoredBackground("");
                setBackgroundUrl("");
                setBackgroundFile(undefined);
              }}
            />
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

export function SsoSettingsForm({
  settings,
  callbackBaseUrl,
}: {
  settings: {
    googleOauthEnabled: boolean;
    googleOauthClientId: string;
    hasGoogleOauthClientSecret: boolean;
    googleOauthHostedDomain: string;
    customOauthEnabled: boolean;
    customOauthName: string;
    customOauthClientId: string;
    hasCustomOauthClientSecret: boolean;
    customOauthDiscoveryUrl: string;
    customOauthAuthorizationUrl: string;
    customOauthTokenUrl: string;
    customOauthUserInfoUrl: string;
    customOauthIssuer: string;
    customOauthScopes: string;
    customOauthPkce: boolean;
  };
  callbackBaseUrl: string;
}) {
  const [state, action, pending] = useActionState(
    updateSsoSettingsAction,
    initialState,
  );

  return (
    <form action={action} className="card settings-card">
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <ShieldCheck size={19} />
        </span>
        <div>
          <h2>Single sign-on</h2>
          <p>
            Allow invited users to sign in through Google or an OpenID
            Connect-compatible OAuth provider.
          </p>
        </div>
      </div>
      <FormMessage state={state} />
      <div className="sso-provider-section">
        <label className="settings-toggle">
          <input
            defaultChecked={settings.googleOauthEnabled}
            name="googleOauthEnabled"
            type="checkbox"
          />
          <span>
            <strong>Google</strong>
            <small>Enable Google Workspace or consumer Google sign-in.</small>
          </span>
        </label>
        <div className="settings-grid">
          <div className="field">
            <label htmlFor="google-oauth-client-id">Client ID</label>
            <input
              className="input"
              defaultValue={settings.googleOauthClientId}
              id="google-oauth-client-id"
              name="googleOauthClientId"
            />
          </div>
          <div className="field">
            <label htmlFor="google-oauth-client-secret">Client secret</label>
            <input
              className="input"
              id="google-oauth-client-secret"
              name="googleOauthClientSecret"
              placeholder={
                settings.hasGoogleOauthClientSecret
                  ? "Stored securely — enter to replace"
                  : ""
              }
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="google-oauth-domain">
              Workspace domain (optional)
            </label>
            <input
              className="input"
              defaultValue={settings.googleOauthHostedDomain}
              id="google-oauth-domain"
              name="googleOauthHostedDomain"
              placeholder="example.com"
            />
          </div>
          <div className="field">
            <label>Authorized callback URL</label>
            <input
              className="input"
              readOnly
              value={`${callbackBaseUrl}/api/auth/callback/google`}
            />
          </div>
        </div>
      </div>
      <div className="sso-provider-section">
        <label className="settings-toggle">
          <input
            defaultChecked={settings.customOauthEnabled}
            name="customOauthEnabled"
            type="checkbox"
          />
          <span>
            <strong>Custom OAuth / OpenID Connect</strong>
            <small>
              Connect Auth0, Okta, Keycloak, Entra ID, or another standards-based
              provider.
            </small>
          </span>
        </label>
        <div className="settings-grid">
          <div className="field">
            <label htmlFor="custom-oauth-name">Button label</label>
            <input
              className="input"
              defaultValue={settings.customOauthName}
              id="custom-oauth-name"
              name="customOauthName"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-client-id">Client ID</label>
            <input
              className="input"
              defaultValue={settings.customOauthClientId}
              id="custom-oauth-client-id"
              name="customOauthClientId"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-client-secret">Client secret</label>
            <input
              className="input"
              id="custom-oauth-client-secret"
              name="customOauthClientSecret"
              placeholder={
                settings.hasCustomOauthClientSecret
                  ? "Stored securely — enter to replace"
                  : ""
              }
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-discovery">
              OpenID discovery URL
            </label>
            <input
              className="input"
              defaultValue={settings.customOauthDiscoveryUrl}
              id="custom-oauth-discovery"
              name="customOauthDiscoveryUrl"
              placeholder="https://id.example.com/.well-known/openid-configuration"
              type="url"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-authorization">
              Authorization URL
            </label>
            <input
              className="input"
              defaultValue={settings.customOauthAuthorizationUrl}
              id="custom-oauth-authorization"
              name="customOauthAuthorizationUrl"
              placeholder="Only needed without discovery"
              type="url"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-token">Token URL</label>
            <input
              className="input"
              defaultValue={settings.customOauthTokenUrl}
              id="custom-oauth-token"
              name="customOauthTokenUrl"
              placeholder="Only needed without discovery"
              type="url"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-user-info">User info URL</label>
            <input
              className="input"
              defaultValue={settings.customOauthUserInfoUrl}
              id="custom-oauth-user-info"
              name="customOauthUserInfoUrl"
              placeholder="Optional when discovery or an ID token is available"
              type="url"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-issuer">Issuer URL</label>
            <input
              className="input"
              defaultValue={settings.customOauthIssuer}
              id="custom-oauth-issuer"
              name="customOauthIssuer"
              placeholder="Optional issuer validation"
              type="url"
            />
          </div>
          <div className="field">
            <label htmlFor="custom-oauth-scopes">Scopes</label>
            <input
              className="input"
              defaultValue={settings.customOauthScopes}
              id="custom-oauth-scopes"
              name="customOauthScopes"
              required
            />
          </div>
          <div className="field">
            <label>Authorized callback URL</label>
            <input
              className="input"
              readOnly
              value={`${callbackBaseUrl}/api/auth/oauth2/callback/custom-oauth`}
            />
          </div>
        </div>
        <label className="settings-toggle compact">
          <input
            defaultChecked={settings.customOauthPkce}
            name="customOauthPkce"
            type="checkbox"
          />
          <span>
            <strong>Use PKCE</strong>
            <small>Recommended for providers that support PKCE.</small>
          </span>
        </label>
      </div>
      <p className="settings-note">
        SSO never creates portal users. The provider email must match an active
        account that was created through an invitation.
      </p>
      <button className="button settings-submit" disabled={pending} type="submit">
        <Save size={17} />
        {pending ? "Saving..." : "Save SSO settings"}
      </button>
    </form>
  );
}

export function TwentySettingsForm({
  settings,
}: {
  settings: {
    twentyBaseUrl: string;
    twentyAutoFormatUrl: boolean;
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
            type="text"
          />
          <span className="field-help">
            Cloud workspace URLs are mapped to https://api.twenty.com.
            Self-hosted URLs use their own origin.
          </span>
        </div>
        <label className="settings-toggle settings-span">
          <input
            defaultChecked={settings.twentyAutoFormatUrl}
            name="twentyAutoFormatUrl"
            type="checkbox"
          />
          <span>
            Automatically format the URL and append the supported GraphQL
            endpoints
          </span>
        </label>
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
          <div className="field">
            <label htmlFor="smtp-secure">Encryption mode</label>
            <select
              className="input"
              defaultValue={settings.smtpSecure ? "true" : "false"}
              id="smtp-secure"
              name="smtpSecure"
            >
              <option value="false">
                STARTTLS / standard SMTP (port 587 or 25)
              </option>
              <option value="true">Implicit TLS (port 465)</option>
            </select>
          </div>
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
        <button
          className="button settings-submit smtp-settings-submit"
          disabled={pending}
          type="submit"
        >
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

export function InvitationEmailTemplateForm({
  template,
}: {
  template: {
    subject: string;
    html: string;
    isCustomized: boolean;
  };
}) {
  const [state, action, pending] = useActionState(
    updateInvitationEmailTemplateAction,
    initialState,
  );
  const [resetPending, startReset] = useTransition();
  const [resetState, setResetState] =
    useState<SettingsActionState>(initialState);

  return (
    <form action={action} className="card settings-card">
      <div className="settings-card-heading">
        <span className="settings-section-icon">
          <Code2 size={19} />
        </span>
        <div>
          <h2>Invitation email template</h2>
          <p>
            Customize the HTML sent to new portal users. The standard template
            follows the portal branding automatically.
          </p>
        </div>
      </div>
      <FormMessage state={state} />
      <FormMessage state={resetState} />
      <div className="field">
        <label htmlFor="invitation-email-subject">Subject</label>
        <input
          className="input"
          defaultValue={template.subject}
          id="invitation-email-subject"
          maxLength={160}
          name="invitationEmailSubject"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="invitation-email-html">HTML template</label>
        <textarea
          className="input email-template-editor"
          defaultValue={template.html}
          id="invitation-email-html"
          name="invitationEmailHtml"
          required
          spellCheck={false}
        />
        <span className="field-help">
          Required: {"{{invite_url}}"}. Available: {"{{recipient_name}}"},{" "}
          {"{{recipient_email}}"}, {"{{brand_name}}"}, {"{{portal_title}}"},
          and {"{{support_email}}"}.
        </span>
      </div>
      <div className="form-actions">
        <button className="button" disabled={pending} type="submit">
          <Save size={17} />
          {pending ? "Saving..." : "Save email template"}
        </button>
        <button
          className="button secondary"
          disabled={resetPending || !template.isCustomized}
          onClick={() =>
            startReset(async () => {
              const result = await resetInvitationEmailTemplateAction();
              setResetState(result);
              if (result.status === "success") window.location.reload();
            })
          }
          type="button"
        >
          <RotateCcw size={17} />
          {resetPending ? "Resetting..." : "Use standard template"}
        </button>
      </div>
    </form>
  );
}
