"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  LoaderCircle,
  Mail,
  Palette,
  Rocket,
  UserRound,
} from "lucide-react";
import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  setupAction,
  testSetupSmtpAction,
  type AuthActionState,
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

const launchStep = {
  title: "Launch",
  description: "Build the workspace and prepare sign-in.",
  icon: Rocket,
} as const;

const provisioningTasks = [
  "Securing the administrator account",
  "Saving workspace connections",
  "Applying the portal brand system",
  "Preparing your sign-in experience",
] as const;

export function SetupForm({
  brandName = "Twenty Portal",
  brandLogoUrl = null,
}: {
  brandName?: string;
  brandLogoUrl?: string | null;
}) {
  const [provisioning, setProvisioning] = useState(false);
  const [setupSucceeded, setSetupSucceeded] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  const [stepTransitioning, setStepTransitioning] = useState(false);
  const [transitionId, setTransitionId] = useState(0);
  const submissionTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const stepTransitionTimerRef = useRef<number | null>(null);
  const [state, action, actionPending] = useActionState(
    async (previousState: AuthActionState, formData: FormData) => {
      const result = await setupAction(previousState, formData);
      if (result.error) {
        setProvisioning(false);
        setSetupSucceeded(false);
        setProvisioningProgress(0);
        setTransitionId((value) => value + 1);
      } else if (result.setupComplete) {
        setSetupSucceeded(true);
        setProvisioningProgress(100);
        completionTimerRef.current = window.setTimeout(() => {
          setShowCompletion(true);
          setTransitionId((value) => value + 1);
        }, 1200);
      }
      return result;
    },
    { error: undefined },
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const [smtpTestState, setSmtpTestState] =
    useState<SetupSmtpTestState | null>(null);
  const [setupSubmitting, startSetupTransition] = useTransition();
  const [testingSmtp, startSmtpTest] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const pending = actionPending || setupSubmitting;

  useEffect(
    () => () => {
      if (submissionTimerRef.current !== null) {
        window.clearTimeout(submissionTimerRef.current);
      }
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      if (stepTransitionTimerRef.current !== null) {
        window.clearTimeout(stepTransitionTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!provisioning || setupSucceeded) return;

    const frame = window.requestAnimationFrame(() => {
      setProvisioningProgress(8);
    });
    const interval = window.setInterval(() => {
      setProvisioningProgress((value) => {
        const remaining = 92 - value;
        return Math.min(92, value + Math.max(0.35, remaining * 0.075));
      });
    }, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [provisioning, setupSucceeded]);

  function beginStepTransition() {
    setStepTransitioning(true);
    if (stepTransitionTimerRef.current !== null) {
      window.clearTimeout(stepTransitionTimerRef.current);
    }
    stepTransitionTimerRef.current = window.setTimeout(() => {
      setStepTransitioning(false);
      stepTransitionTimerRef.current = null;
    }, 420);
  }

  function finishStepTransition() {
    if (stepTransitionTimerRef.current !== null) {
      window.clearTimeout(stepTransitionTimerRef.current);
      stepTransitionTimerRef.current = null;
    }
    setStepTransitioning(false);
  }

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
    if (stepTransitioning || !validateCurrentStep()) return;
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    beginStepTransition();
    setDirection("forward");
    setTransitionId((value) => value + 1);
    setCurrentStep(nextStep);
    setFurthestStep((previous) => Math.max(previous, nextStep));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(index: number) {
    if (index > furthestStep || provisioning || stepTransitioning) return;
    if (index === currentStep) return;
    setDirection(index < currentStep ? "backward" : "forward");
    beginStepTransition();
    setTransitionId((value) => value + 1);
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (stepTransitioning) {
      event.preventDefault();
      return;
    }
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
      return;
    }

    event.preventDefault();
    if (provisioning) return;

    const formData = new FormData(event.currentTarget);
    setTransitionId((value) => value + 1);
    setProvisioning(true);
    setProvisioningProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    submissionTimerRef.current = window.setTimeout(() => {
      startSetupTransition(() => action(formData));
    }, 1200);
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

    const formData = new FormData();
    for (const name of [
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
      className={`setup-workflow-form ${
        currentStep === 0 && !provisioning && !showCompletion
          ? "is-welcome"
          : "is-guided"
      }`}
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <aside
        aria-hidden={currentStep !== 0 || provisioning || showCompletion}
        className="setup-welcome-panel"
        hidden={currentStep !== 0 || provisioning || showCompletion}
      >
        <SetupBrand brandLogoUrl={brandLogoUrl} brandName={brandName} inverse />
        <div className="setup-welcome-copy">
          <p className="eyebrow">New client workspace</p>
          <h1>A few focused steps from a portal that feels like yours.</h1>
          <p>
            Create the first administrator, connect Twenty, and shape the
            experience your clients will see.
          </p>
        </div>
        <div aria-hidden="true" className="setup-welcome-collage">
          <article className="setup-welcome-card setup-welcome-card-data">
            <span className="setup-welcome-card-icon">
              <Database size={17} />
            </span>
            <small>Twenty workspace</small>
            <strong>Connected</strong>
            <p><i /> Records ready to sync</p>
          </article>
          <article className="setup-welcome-card setup-welcome-card-brand">
            <span className="setup-welcome-card-icon">
              <Palette size={17} />
            </span>
            <small>Client experience</small>
            <strong>Branded</strong>
            <div className="setup-welcome-swatches">
              <i />
              <i />
              <i />
            </div>
          </article>
        </div>
      </aside>

      <nav
        aria-label="Setup progress"
        className="setup-progress"
        hidden={currentStep === 0 && !provisioning && !showCompletion}
      >
        <SetupBrand brandLogoUrl={brandLogoUrl} brandName={brandName} />
        {[...steps, launchStep].map((step, index) => {
          const Icon = step.icon;
          const isLaunch = index === steps.length;
          const isActive = provisioning ? isLaunch : index === currentStep;
          const isComplete = provisioning
            ? index < steps.length
            : index < currentStep || index < furthestStep;
          return (
            <button
              aria-current={isActive ? "step" : undefined}
              className={`setup-progress-item${isActive ? " is-active" : ""}${
                isComplete ? " is-complete" : ""
              }`}
              disabled={provisioning || isLaunch || index > furthestStep}
              key={step.title}
              onClick={() => goToStep(index)}
              type="button"
            >
              <span className="setup-progress-number">
                {isComplete && !isActive ? (
                  <Check size={15} />
                ) : (
                  <Icon aria-hidden="true" size={15} />
                )}
              </span>
              <span className="setup-progress-copy">
                <small>Step {String(index + 1).padStart(2, "0")}</small>
                <strong>{step.title}</strong>
              </span>
            </button>
          );
        })}
        <div className="setup-rail-summary">
          <span>
            Workspace setup
            <strong>
              {provisioning ? steps.length + 1 : currentStep + 1} of{" "}
              {steps.length + 1}
            </strong>
          </span>
          <progress
            aria-label="Setup steps completed"
            max={steps.length + 1}
            value={provisioning ? steps.length + 1 : currentStep + 1}
          />
        </div>
      </nav>

      <div
        className={`setup-stage is-${direction}${
          provisioning && !showCompletion ? " is-provisioning" : ""
        }${showCompletion ? " is-complete" : ""}`}
      >
        <span
          aria-hidden="true"
          className="setup-transition-wash"
          key={transitionId}
          onAnimationEnd={finishStepTransition}
        />
        <section
          aria-labelledby="setup-provisioning-title"
          aria-live="polite"
          className={`setup-provisioning${setupSucceeded ? " is-complete" : ""}`}
          hidden={!provisioning || showCompletion}
        >
            <span className="setup-provisioning-icon">
              {setupSucceeded ? (
                <Check size={22} />
              ) : (
                <LoaderCircle className="spin-icon" size={22} />
              )}
            </span>
            <p className="eyebrow">Workspace initialization</p>
            <h2 id="setup-provisioning-title">Building your client portal</h2>
            <p className="setup-provisioning-copy">
              Your configuration is being secured and assembled. Keep this
              window open until sign-in is ready.
            </p>
            <div
              aria-label="Workspace setup progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(provisioningProgress)}
              className="setup-provisioning-progress"
              role="progressbar"
            >
              <span style={{ width: `${provisioningProgress}%` }} />
            </div>
            <div className="setup-provisioning-status">
              <span>
                {setupSucceeded
                  ? "Workspace configuration complete"
                  : pending
                    ? "Finalizing workspace"
                    : "Starting setup"}
              </span>
              <strong>
                {Math.round(provisioningProgress)}%
              </strong>
            </div>
            <ul className="setup-provisioning-tasks">
              {provisioningTasks.map((task, index) => (
                <li
                  key={task}
                  style={{ "--task-index": index } as React.CSSProperties}
                >
                  <span>
                    <Check size={13} />
                  </span>
                  {task}
                </li>
              ))}
            </ul>
        </section>
        <section
          aria-labelledby="setup-complete-title"
          className="setup-complete"
          hidden={!showCompletion}
        >
          <span className="setup-complete-icon">
            <Check size={24} />
          </span>
          <p className="eyebrow">Workspace ready</p>
          <h2 id="setup-complete-title">Your portal is ready for sign-in.</h2>
          <p>
            Start with a short guided tour of portal views, invitations, and
            settings, or head directly to the administrator dashboard.
          </p>
          <div className="setup-complete-actions">
            <a
              className="button"
              href="/login?setup=complete&tour=1"
              onClick={() =>
                window.sessionStorage.setItem("admin-tour-pending", "1")
              }
            >
              Sign in and take the tour
              <ArrowRight size={15} />
            </a>
            <a
              className="button secondary"
              href="/login?setup=complete"
              onClick={() =>
                window.sessionStorage.removeItem("admin-tour-pending")
              }
            >
              Skip for now
            </a>
          </div>
        </section>
        <div
          className="setup-form-content"
          hidden={provisioning || showCompletion}
        >
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
                  disabled={pending || stepTransitioning}
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
                <button
                  className="button"
                  disabled={stepTransitioning}
                  onClick={continueSetup}
                  type="button"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="button"
                  data-setup-complete="true"
                  disabled={pending || stepTransitioning}
                  type="submit"
                >
                  {pending ? "Creating portal…" : "Launch workspace"}
                  {!pending ? <Rocket size={16} /> : null}
                </button>
              )}
            </div>
        </div>
      </div>
    </form>
  );
}

function SetupBrand({
  brandName,
  brandLogoUrl,
  inverse = false,
}: {
  brandName: string;
  brandLogoUrl: string | null;
  inverse?: boolean;
}) {
  return (
    <div className={`setup-brand${inverse ? " is-inverse" : ""}`}>
      {brandLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={brandLogoUrl} />
      ) : (
        <span>{brandName.slice(0, 2).toUpperCase()}</span>
      )}
      <strong>{brandName}</strong>
    </div>
  );
}
