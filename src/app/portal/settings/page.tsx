import { ProfileSettingsForm } from "@/components/settings-forms";
import { requireSession } from "@/lib/access";

export default async function PortalSettingsPage() {
  const current = await requireSession();

  return (
    <div className="settings-page">
      <ProfileSettingsForm
        email={current.user.email}
        initialImage={current.user.image ?? null}
        initialName={current.user.name}
      />
    </div>
  );
}
