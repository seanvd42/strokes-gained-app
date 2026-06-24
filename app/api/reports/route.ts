import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportConfigs, reportLogs } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await db.select().from(reportConfigs).orderBy(desc(reportConfigs.isDefault), desc(reportConfigs.createdAt));

  const result = await Promise.all(
    configs.map(async (config) => {
      const logs = await db
        .select()
        .from(reportLogs)
        .where(eq(reportLogs.configId, config.id))
        .orderBy(desc(reportLogs.sentAt))
        .limit(3);
      return { ...config, logs };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, frequency, dayOfWeek, dayOfMonth, email, periods, sections, enabled } = body;

  if (!name || !frequency || !email || !periods || !sections) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [config] = await db.insert(reportConfigs).values({
    name,
    frequency,
    dayOfWeek: dayOfWeek ?? null,
    dayOfMonth: dayOfMonth ?? null,
    email,
    periods: JSON.stringify(periods),
    sections: JSON.stringify(sections),
    enabled: enabled ?? true,
    isDefault: false,
  }).returning();

  return NextResponse.json(config, { status: 201 });
}
