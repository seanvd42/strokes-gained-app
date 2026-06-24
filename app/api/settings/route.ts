import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, appSettings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settingsRows, allAccounts] = await Promise.all([
    db.select().from(appSettings),
    db.select().from(accounts),
  ]);

  const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));

  return NextResponse.json({
    settings,
    accounts: allAccounts,
    simplefinConfigured: !!process.env.SIMPLEFIN_ACCESS_URL,
    emailConfigured: !!process.env.RESEND_API_KEY,
    aiConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(appSettings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: String(value), updatedAt: new Date() } });
  }

  return NextResponse.json({ success: true });
}
