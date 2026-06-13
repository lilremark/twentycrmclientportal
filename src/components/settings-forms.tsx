"use client";

import { useActionState, useState } from "react";
import { Palette, Save, UserRound } from "lucide-react";

import {
  type SettingsActionState,
  updateApplicationSettingsAction,
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

  return (
    <form action={action} className="card settings-card">
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
        <AvatarPreview image={image} name={name} />
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
            <label htmlFor="profile-image">Avatar image URL</label>
            <input
              className="input"
              id="profile-image"
              name="image"
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/avatar.png"
              type="url"
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

  return (
    <form action={action} className="card settings-card">
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
          <label htmlFor="brand-logo">Logo URL</label>
          <input
            className="input"
            defaultValue={settings.brandLogoUrl ?? ""}
            id="brand-logo"
            name="brandLogoUrl"
            placeholder="https://example.com/logo.svg"
            type="url"
          />
        </div>
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
