import { getAuth } from "@/lib/auth";

async function handler(request: Request) {
  return (await getAuth()).handler(request);
}

export const GET = handler;
export const POST = handler;
