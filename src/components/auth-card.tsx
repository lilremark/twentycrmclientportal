export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="card w-full max-w-md p-7">
        <div className="mb-7">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#3157d5] font-bold text-white">
            20
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#68758a]">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
