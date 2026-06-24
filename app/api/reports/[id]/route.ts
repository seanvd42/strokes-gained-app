import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportConfigs } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) data.name = body.name;
  if (body.enabled !== undefined) data.enabled = body.enabled;
  if (body.frequency !== undefined) data.frequency = body.frequency;
  if (body.dayOfWeek !== undefined) data.dayOfWeek = body.dayOfWeek;
  if (body.dayOfMonth !== undefined) data.dayOfMonth = body.dayOfMonth;
  if (body.email !== undefined) data.email = body.email;
  if (body.periods !== undefined) data.periods = JSON.stringify(body.periods);
  if (body.sections !== undefined) data.sections = JSON.stringify(body.sections);

  const [config] = await db.update(reportConfigs).set(data).where(eq(reportConfigs.id, id)).returning();
  return NextResponse.json(config);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [config] = await db.select().from(reportConfigs).where(eq(reportConfigs.id, id)).limit(1);
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (config.isDefault) return NextResponse.json({ error: "Cannot delete default reports" }, { status: 400 });

  await db.delete(reportConfigs).where(eq(reportConfigs.id, id));
  return NextResponse.json({ success: true });
}
