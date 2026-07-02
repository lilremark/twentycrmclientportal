import { ProfileSettingsForm } from "@/components/settings-forms";
import { requireSession } from "@/lib/access";

export default async function PortalSettingsPage() {
  const current = await requireSession();

  return (
    <div className="settings-layout portal-profile-settings-layout">
      <div className="settings-workspace">
        <header className="settings-workspace-heading">
          <p className="eyebrow">Settings</p>
          <h2>Profile</h2>
          <p>Your portal identity</p>
        </header>
        <section className="settings-section-panel">
          <ProfileSettingsForm
            email={current.user.email}
            initialImage={current.user.image ?? null}
            initialName={current.user.name}
          />
        </section>
      </div>
    </div>
  );
}
