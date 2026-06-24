import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, transactionCategorizations } from "@/drizzle/schema";
import { eq, sql, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      color: categories.color,
      icon: categories.icon,
      count: sql<number>`count(${transactionCategorizations.id})`,
    })
    .from(categories)
    .leftJoin(transactionCategorizations, eq(categories.id, transactionCategorizations.categoryId))
    .groupBy(categories.id)
    .orderBy(asc(categories.type), asc(categories.name));

  return NextResponse.json(rows.map((r) => ({ ...r, _count: { categorizations: Number(r.count) } })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, color, icon } = body;
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });

  const [category] = await db.insert(categories).values({
    name, type, color: color || "#6366f1", icon: icon || "circle",
  }).returning();

  return NextResponse.json(category, { status: 201 });
}
