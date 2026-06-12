import { count } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getCurrentSession, isAdministrator } from "@/lib/access";
import { db } from "@/lib/db";
import { portalAdministrators } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(portalAdministrators);
  if (adminCount === 0) redirect("/setup");

  const current = await getCurrentSession();
  if (!current) redirect("/login");
  redirect((await isAdministrator(current.user.id)) ? "/admin" : "/portal");
}
