import { getBranding } from "@/lib/env";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const branding = getBranding();
  return (
    <main
      className="grid min-h-screen place-items-center px-5 py-10"
      style={{ "--brand-primary": branding.primaryColor } as React.CSSProperties}
    >
      <section className="card w-full max-w-md p-7">
        <div className="mb-7">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={branding.name}
              className="brand-logo mb-4"
              src={branding.logoUrl}
            />
          ) : (
            <div className="brand-mark mb-4">
              {branding.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <p className="mb-2 text-sm font-semibold text-[var(--muted)]">
            {branding.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#68758a]">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
