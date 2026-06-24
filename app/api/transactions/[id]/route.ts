import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, transactionCategorizations, categories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { learnFromCorrection } from "@/lib/ai";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [existingCat] = await db.select().from(transactionCategorizations).where(eq(transactionCategorizations.transactionId, id)).limit(1);

  if (body.categoryId) {
    const [category] = await db.select().from(categories).where(eq(categories.id, body.categoryId)).limit(1);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    if (existingCat) {
      await db.update(transactionCategorizations)
        .set({ categoryId: body.categoryId, confidence: 1.0, method: "MANUAL", needsReview: false, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(transactionCategorizations.transactionId, id));
    } else {
      await db.insert(transactionCategorizations).values({
        transactionId: id,
        categoryId: body.categoryId,
        confidence: 1.0,
        method: "MANUAL",
        needsReview: false,
        reviewedAt: new Date(),
      });
    }

    await learnFromCorrection(tx.description, body.categoryId);
  }

  if (body.notes !== undefined) {
    await db.update(transactions).set({ notes: body.notes }).where(eq(transactions.id, id));
  }

  if (body.markReviewed && existingCat) {
    await db.update(transactionCategorizations)
      .set({ needsReview: false, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(transactionCategorizations.transactionId, id));
  }

  return NextResponse.json({ success: true });
}
