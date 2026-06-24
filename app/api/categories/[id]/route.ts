import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, transactionCategorizations } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, string> = {};
  if (body.name) data.name = body.name;
  if (body.color) data.color = body.color;
  if (body.icon) data.icon = body.icon;

  const [category] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return NextResponse.json(category);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionCategorizations)
    .where(eq(transactionCategorizations.categoryId, id));

  if (Number(count) > 0) {
    return NextResponse.json({ error: `Cannot delete: ${count} transactions use this category` }, { status: 400 });
  }

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ success: true });
}
