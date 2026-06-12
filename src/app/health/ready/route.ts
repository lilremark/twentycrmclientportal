import { NextResponse } from "next/server";

import { postgresClient } from "@/lib/db";

export async function GET() {
  try {
    await postgresClient`select 1`;
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
