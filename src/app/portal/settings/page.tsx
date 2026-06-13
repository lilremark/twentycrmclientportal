import { ProfileSettingsForm } from "@/components/settings-forms";
import { requireSession } from "@/lib/access";

export default async function PortalSettingsPage() {
  const current = await requireSession();

  return (
    <div className="settings-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Your account</p>
          <h2>Settings</h2>
          <p>Manage your personal information and portal identity.</p>
        </div>
      </div>
      <ProfileSettingsForm
        email={current.user.email}
        initialImage={current.user.image ?? null}
        initialName={current.user.name}
      />
      <section className="card settings-card compact-settings-card">
        <h2>Appearance</h2>
        <p>
          Use the sun or moon icon in the application header to choose your
          preferred theme. Your selection is saved in this browser.
        </p>
      </section>
    </div>
  );
}
