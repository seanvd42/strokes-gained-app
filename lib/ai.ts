import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { categorizationRules, categories } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CategorizationResult {
  categoryName: string;
  confidence: number;
  explanation: string;
  needsReview: boolean;
}

interface BatchItem {
  id: string;
  description: string;
  amount: number;
}

const CONFIDENCE_THRESHOLD = 0.75;

export async function applyRules(
  description: string
): Promise<{ categoryId: string; categoryName: string } | null> {
  const rules = await db.query.categorizationRules.findMany({
    with: { category: true },
    orderBy: [desc(categorizationRules.priority)],
  });

  for (const rule of rules) {
    let matches = false;
    const upper = description.toUpperCase();
    const pattern = rule.pattern.toUpperCase();

    if (rule.matchType === "CONTAINS") {
      matches = upper.includes(pattern);
    } else if (rule.matchType === "EXACT") {
      matches = upper === pattern;
    } else if (rule.matchType === "REGEX") {
      try {
        matches = new RegExp(rule.pattern, "i").test(description);
      } catch {
        matches = false;
      }
    }

    if (matches) {
      return { categoryId: rule.categoryId, categoryName: rule.category.name };
    }
  }

  return null;
}

export async function categorizeTransactions(
  items: BatchItem[],
  existingCategories: string[]
): Promise<Record<string, CategorizationResult>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          categoryName: "Uncategorized",
          confidence: 0.5,
          explanation: "AI categorization not configured.",
          needsReview: true,
        },
      ])
    );
  }

  const prompt = `You are a financial transaction categorizer. Categorize each transaction into one of the provided categories.

Available categories: ${existingCategories.join(", ")}

For each transaction, respond with a JSON object where keys are transaction IDs and values have:
- categoryName: exact category name from the list above
- confidence: float 0.0-1.0 (how confident you are)
- explanation: one short sentence explaining why

Rules:
- Negative amounts are expenses, positive are income
- Use "Uncategorized" only if truly unclear
- Be conservative with confidence - use <0.75 when genuinely ambiguous
- Common patterns: DIRECT DEPOSIT=Salary, utility companies=Utilities, restaurant names=Restaurants

Transactions:
${items.map((t) => `ID:${t.id} | "${t.description}" | $${t.amount.toFixed(2)}`).join("\n")}

Respond with ONLY valid JSON, no markdown.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    const results: Record<string, CategorizationResult> = {};
    for (const item of items) {
      const r = parsed[item.id] || { categoryName: "Uncategorized", confidence: 0.4, explanation: "Could not categorize." };
      const confidence = Math.max(0.1, Math.min(0.99, Number(r.confidence) || 0.5));
      results[item.id] = {
        categoryName: r.categoryName || "Uncategorized",
        confidence,
        explanation: r.explanation || "",
        needsReview: confidence < CONFIDENCE_THRESHOLD,
      };
    }
    return results;
  } catch (e) {
    console.error("AI categorization error:", e);
    return Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          categoryName: "Uncategorized",
          confidence: 0.3,
          explanation: "Categorization failed.",
          needsReview: true,
        },
      ])
    );
  }
}

export async function learnFromCorrection(
  description: string,
  categoryId: string
): Promise<void> {
  const words = description
    .split(/[\s*#]+/)
    .filter((w) => w.length > 3 && !/^\d+$/.test(w))
    .slice(0, 2);

  if (words.length === 0) return;

  const pattern = words[0].toUpperCase();

  const [existing] = await db
    .select()
    .from(categorizationRules)
    .where(eq(categorizationRules.pattern, pattern))
    .limit(1);

  if (!existing) {
    await db.insert(categorizationRules).values({
      pattern,
      matchType: "CONTAINS",
      categoryId,
      priority: 7,
    });
  } else if (existing.categoryId !== categoryId) {
    await db
      .update(categorizationRules)
      .set({ categoryId, priority: 7 })
      .where(eq(categorizationRules.id, existing.id));
  }
}
