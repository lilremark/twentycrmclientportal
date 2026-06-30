"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  LoaderCircle,
  Mail,
  Palette,
  UserRound,
} from "lucide-react";
import {
  type FormEvent,
  useActionState,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  setupAction,
  testSetupSmtpAction,
  type SetupSmtpTestState,
} from "@/app/actions/auth";
import { AppSelect } from "@/components/ui/app-select";

const steps = [
  {
    title: "Administrator",
    description: "Secure the portal and create its first owner.",
    icon: UserRound,
  },
  {
    title: "Twenty CRM",
    description: "Connect the portal to your Twenty workspace.",
    icon: Database,
  },
  {
    title: "Email",
    description: "Configure delivery for invitations and account messages.",
    icon: Mail,
  },
  {
    title: "Branding",
    description: "Make the portal recognizable to your clients.",
    icon: Palette,
  },
] as const;

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, {
    error: undefined,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [smtpTestState, setSmtpTestState] =
    useState<SetupSmtpTestState | null>(null);
  const [testingSmtp, startSmtpTest] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function validateCurrentStep() {
    const panel = formRef.current?.querySelector<HTMLElement>(
      `[data-setup-panel="${currentStep}"]`,
    );
    const controls = panel?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");

    for (const control of controls ?? []) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }

    return true;
  }

  function continueSetup() {
    if (!validateCurrentStep()) return;
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setCurrentStep(nextStep);
    setFurthestStep((previous) => Math.max(previous, nextStep));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(index: number) {
    if (index > furthestStep) return;
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (currentStep < steps.length - 1) {
      event.preventDefault();
      continueSetup();
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (
      !(submitter instanceof HTMLButtonElement) ||
      submitter.dataset.setupComplete !== "true"
    ) {
      event.preventDefault();
    }
  }

  function testSmtpConnection() {
    const form = formRef.current;
    if (!form) return;

    const smtpPanel = form.querySelector<HTMLElement>(
      '[data-setup-panel="2"]',
    );
    const controls = smtpPanel?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");
    for (const control of controls ?? []) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return;
      }
    }

    const setupToken = form.elements.namedItem("setupToken");
    if (!(setupToken instanceof HTMLInputElement) || !setupToken.value) {
      setSmtpTestState({
        status: "error",
        message: "Enter the setup token in the Administrator step first.",
      });
      return;
    }

    const formData = new FormData();
    for (const name of [
      "setupToken",
      "smtpHost",
      "smtpPort",
      "smtpSecure",
      "smtpUser",
      "smtpPassword",
    ]) {
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLSelectElement) {
        formData.set(name, control.value);
      } else if (
        control instanceof HTMLInputElement &&
        (control.type !== "checkbox" || control.checked)
      ) {
        formData.set(name, control.value);
      }
    }

    setSmtpTestState(null);
    startSmtpTest(async () => {
      setSmtpTestState(await testSetupSmtpAction(formData));
    });
  }

  return (
    <form
      action={action}
      className="setup-workflow-form"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <nav aria-label="Setup progress" className="setup-progress">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep || index < furthestStep;
          return (
            <button
              aria-current={isActive ? "step" : undefined}
              className={`setup-progress-item${isActive ? " is-active" : ""}${
                isComplete ? " is-complete" : ""
              }`}
              disabled={index > furthestStep}
              key={step.title}
              onClick={() => goToStep(index)}
              type="button"
            >
              <span className="setup-progress-number">
                {isComplete && !isActive ? <Check size={15} /> : index + 1}
              </span>
              <span className="setup-progress-copy">
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
              <Icon aria-hidden="true" className="setup-progress-icon" size={18} />
            </button>
          );
        })}
      </nav>

      <div className="setup-stage">
        <div className="setup-stage-kicker">
          Step {currentStep + 1} of {steps.length}
        </div>

        {state.error ? (
          <p className="error setup-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <fieldset
          className="setup-panel"
          data-setup-panel="0"
          hidden={currentStep !== 0}
        >
          <legend>Create the portal administrator</legend>
          <p className="setup-panel-intro">
            This account has full access to portal configuration and client
            administration. Setup is permanently locked after completion.
          </p>
          <div className="setup-fields">
            <div className="field setup-field-wide">
              <label htmlFor="setupToken">Setup token</label>
              <input
                autoComplete="off"
                className="input"
                id="setupToken"
                name="setupToken"
                required
                type="password"
              />
              <p className="setup-field-note">
                Use the <code>SETUP_TOKEN</code> configured on your server.
              </p>
            </div>
            <div className="field">
              <label htmlFor="name">Administrator name</label>
              <input
                autoComplete="name"
                className="input"
                id="name"
                minLength={2}
                name="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                autoComplete="email"
                className="input"
                id="email"
                name="email"
                required
                type="email"
              />
            </div>
            <div className="field setup-field-wide">
              <label htmlFor="password">Password</label>
              <input
                autoComplete="new-password"
                className="input"
                id="password"
                minLength={12}
                name="password"
                required
                type="password"
              />
              <p className="setup-field-note">
                At least 12 characters with uppercase, lowercase, and a number.
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset
          className="setup-panel"
          data-setup-panel="1"
          hidden={currentStep !== 1}
        >
          <legend>Connect Twenty CRM</legend>
          <p className="setup-panel-intro">
            Add the public address and credentials for the Twenty workspace this
            portal will expose.
          </p>
          <div className="setup-fields">
            <div className="field setup-field-wide">
              <label htmlFor="twentyBaseUrl">Twenty base URL</label>
              <input
                className="input"
                id="twentyBaseUrl"
                name="twentyBaseUrl"
                placeholder="https://crm.example.com"
                type="text"
              />
            </div>
            <label className="settings-toggle setup-field-wide">
              <input defaultChecked name="twentyAutoFormatUrl" type="checkbox" />
              <span>Automatically format Twenty API endpoints</span>
            </label>
            <div className="field">
              <label htmlFor="twentyApiKey">API key</label>
              <input
                autoComplete="off"
                className="input"
                id="twentyApiKey"
                name="twentyApiKey"
                type="password"
              />
            </div>
            <div className="field">
              <label htmlFor="twentyWebhookSecret">Webhook secret</label>
              <input
                autoComplete="off"
                className="input"
                id="twentyWebhookSecret"
                name="twentyWebhookSecret"
                type="password"
              />
            </div>
          </div>
          <aside className="setup-callout">
            You can leave these values blank and add them later in Administrator
            Settings.
          </aside>
        </fieldset>

        <fieldset
          className="setup-panel"
          data-setup-panel="2"
          hidden={currentStep !== 2}
        >
          <legend>Configure portal email</legend>
          <p className="setup-panel-intro">
            SMTP powers invitations, password resets, and other transactional
            messages.
          </p>
          <div className="setup-fields">
            <div className="field">
              <label htmlFor="smtpHost">SMTP host</label>
              <input className="input" id="smtpHost" name="smtpHost" />
            </div>
            <div className="field">
              <label htmlFor="smtpPort">SMTP port</label>
              <input
                className="input"
                defaultValue="587"
                id="smtpPort"
                min="1"
                name="smtpPort"
                type="number"
              />
            </div>
            <div className="field">
              <label htmlFor="smtpUser">SMTP username</label>
              <input
                autoComplete="off"
                className="input"
                id="smtpUser"
                name="smtpUser"
              />
            </div>
            <div className="field">
              <label htmlFor="smtpPassword">SMTP password</label>
              <input
                autoComplete="new-password"
                className="input"
                id="smtpPassword"
                name="smtpPassword"
                type="password"
              />
            </div>
            <div className="field setup-field-wide">
              <label htmlFor="smtpFrom">From address</label>
              <input
                className="input"
                id="smtpFrom"
                name="smtpFrom"
                placeholder="Twenty Portal <portal@example.com>"
              />
            </div>
            <div className="field setup-field-wide">
              <label htmlFor="smtpSecure">Encryption mode</label>
              <AppSelect
                className="input"
                defaultValue="false"
                id="smtpSecure"
                name="smtpSecure"
              >
                <option value="false">
                  STARTTLS / standard SMTP (port 587 or 25)
                </option>
                <option value="true">Implicit TLS (port 465)</option>
              </AppSelect>
              <p className="setup-field-note">
                Port 587 starts as SMTP and upgrades with STARTTLS. Port 465
                starts encrypted immediately.
              </p>
            </div>
          </div>
          <aside className="setup-callout">
            Email is optional during setup. Verification checks the SMTP server
            and credentials without sending a message or saving these settings.
          </aside>
          <div className="setup-smtp-test">
            <button
              className="button secondary"
              disabled={testingSmtp}
              onClick={testSmtpConnection}
              type="button"
            >
              {testingSmtp ? (
                <LoaderCircle className="spin-icon" size={16} />
              ) : (
                <Mail size={16} />
              )}
              {testingSmtp ? "Testing connection…" : "Test SMTP connection"}
            </button>
            <p
              aria-live="polite"
              className={
                smtpTestState
                  ? smtpTestState.status === "success"
                    ? "success"
                    : "error"
                  : undefined
              }
            >
              {smtpTestState?.message}
            </p>
          </div>
        </fieldset>

        <fieldset
          className="setup-panel"
          data-setup-panel="3"
          hidden={currentStep !== 3}
        >
          <legend>Apply your branding</legend>
          <p className="setup-panel-intro">
            The uploaded brand icon is also used as the browser favicon across
            the portal.
          </p>
          <div className="setup-fields">
            <div className="field">
              <label htmlFor="brandName">Application name</label>
              <input
                className="input"
                defaultValue="Twenty Portal"
                id="brandName"
                name="brandName"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="primaryColor">Primary color</label>
              <input
                className="input setup-color-input"
                defaultValue="#3157d5"
                id="primaryColor"
                name="primaryColor"
                type="color"
              />
            </div>
            <div className="field">
              <label htmlFor="brandLogoFile">Upload brand icon</label>
              <input
                accept="image/*"
                className="input"
                id="brandLogoFile"
                name="brandLogoFile"
                type="file"
              />
              <p className="setup-field-note">
                A square PNG, SVG, or WEBP works best for navigation and browser
                tabs.
              </p>
            </div>
            <div className="field">
              <label htmlFor="brandLogoUrl">Or use an icon URL</label>
              <input
                className="input"
                id="brandLogoUrl"
                name="brandLogoUrl"
                type="url"
              />
            </div>
            <div className="field">
              <label htmlFor="portalTitle">Portal heading</label>
              <input
                className="input"
                defaultValue="Client portal"
                id="portalTitle"
                name="portalTitle"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="supportEmail">Support email</label>
              <input
                className="input"
                id="supportEmail"
                name="supportEmail"
                type="email"
              />
            </div>
            <div className="field setup-field-wide">
              <label htmlFor="portalDescription">Welcome message</label>
              <textarea
                className="input"
                defaultValue="Secure access to the records shared with your team."
                id="portalDescription"
                maxLength={240}
                name="portalDescription"
                required
                rows={3}
              />
            </div>
            <div className="field">
              <label htmlFor="loginBackgroundFile">Sign-in background</label>
              <input
                accept="image/png"
                className="input"
                id="loginBackgroundFile"
                name="loginBackgroundFile"
                type="file"
              />
            </div>
            <div className="field">
              <label htmlFor="loginBackgroundUrl">Or use a background URL</label>
              <input
                className="input"
                id="loginBackgroundUrl"
                name="loginBackgroundUrl"
                type="url"
              />
            </div>
          </div>
        </fieldset>

        <div className="setup-actions">
          {currentStep > 0 ? (
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => goToStep(currentStep - 1)}
              type="button"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <span />
          )}

          {currentStep < steps.length - 1 ? (
            <button className="button" onClick={continueSetup} type="button">
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="button"
              data-setup-complete="true"
              disabled={pending}
              type="submit"
            >
              {pending ? "Creating portal…" : "Complete setup"}
              {!pending ? <Check size={16} /> : null}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
