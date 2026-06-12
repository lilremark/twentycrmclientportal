import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";

export function AppShell({
  title,
  subtitle,
  navigation,
  children,
}: {
  title: string;
  subtitle: string;
  navigation: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-[#dde3ed] bg-white p-5 lg:min-h-screen lg:border-r lg:border-b-0">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#3157d5] font-bold text-white">
            20
          </span>
          <span>
            <strong className="block text-sm">Twenty Portal</strong>
            <span className="text-xs text-[#68758a]">{subtitle}</span>
          </span>
        </Link>
        <nav className="mt-7 flex gap-2 overflow-x-auto lg:grid">
          {navigation.map((item) => (
            <Link
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[#4e5b70] hover:bg-[#f0f3f9] hover:text-[#172033]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0">
        <header className="flex items-center justify-between border-b border-[#dde3ed] bg-white px-5 py-4 md:px-8">
          <h1 className="text-xl font-bold">{title}</h1>
          <SignOutButton />
        </header>
        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
