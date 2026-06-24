import { Resend } from "resend";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { db } from "./db";
import {
  transactions,
  transactionCategorizations,
  categories,
  reportConfigs,
  reportLogs,
} from "@/drizzle/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { getPeriodDates, formatCurrency } from "./utils";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ReportData {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  categoryBreakdown: Array<{ name: string; amount: number; color: string }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
  reviewQueue: Array<{ description: string; amount: number; suggestedCategory: string; confidence: number }>;
}

export async function buildReportData(periods: string[]): Promise<Record<string, ReportData>> {
  const results: Record<string, ReportData> = {};

  for (const period of periods) {
    const { start, end, label } = getPeriodDates(period);

    const txs = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        description: transactions.description,
        confidence: transactionCategorizations.confidence,
        needsReview: transactionCategorizations.needsReview,
        reviewedAt: transactionCategorizations.reviewedAt,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(transactionCategorizations, eq(transactions.id, transactionCategorizations.transactionId))
      .leftJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
      .where(and(gte(transactions.date, start), lte(transactions.date, end)));

    const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    const catMap: Record<string, { amount: number; color: string }> = {};
    for (const tx of txs) {
      if (tx.amount >= 0) continue;
      const name = tx.categoryName || "Uncategorized";
      const color = tx.categoryColor || "#6b7280";
      if (!catMap[name]) catMap[name] = { amount: 0, color };
      catMap[name].amount += Math.abs(tx.amount);
    }

    const categoryBreakdown = Object.entries(catMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    let cursor = new Date(start);
    const monthlyTrend: Array<{ month: string; income: number; expenses: number }> = [];
    while (cursor <= end) {
      const ms = startOfMonth(cursor);
      const me = endOfMonth(cursor);
      const mTxs = txs.filter((t) => t.date >= ms && t.date <= me);
      monthlyTrend.push({
        month: format(cursor, "MMM yyyy"),
        income: mTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
        expenses: mTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const reviewQueue = txs
      .filter((t) => t.needsReview && !t.reviewedAt)
      .map((t) => ({
        description: t.description,
        amount: t.amount,
        suggestedCategory: t.categoryName || "Uncategorized",
        confidence: t.confidence || 0,
      }))
      .slice(0, 10);

    results[period] = { period: label, totalIncome: income, totalExpenses: expenses, netFlow: income - expenses, categoryBreakdown, monthlyTrend, reviewQueue };
  }

  return results;
}

function buildQuickChartUrl(type: string, labels: string[], datasets: object[]): string {
  const config = {
    type,
    data: { labels, datasets },
    options: {
      plugins: { legend: { labels: { color: "#e2e8f0" } } },
      scales: type !== "doughnut" ? {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
      } : undefined,
    },
  };
  return `https://quickchart.io/chart?backgroundColor=%230f172a&c=${encodeURIComponent(JSON.stringify(config))}&w=600&h=300`;
}

function buildEmailHtml(reportDataMap: Record<string, ReportData>, sections: string[], appUrl: string): string {
  const primary = Object.values(reportDataMap)[0];
  const appLink = appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const netColor = primary.netFlow >= 0 ? "#22c55e" : "#ef4444";
  const netSign = primary.netFlow >= 0 ? "+" : "";

  const catChartUrl = buildQuickChartUrl(
    "doughnut",
    primary.categoryBreakdown.map((c) => c.name),
    [{ data: primary.categoryBreakdown.map((c) => Math.round(c.amount * 100) / 100), backgroundColor: primary.categoryBreakdown.map((c) => c.color) }]
  );

  const trendChartUrl = primary.monthlyTrend.length > 1
    ? buildQuickChartUrl("bar", primary.monthlyTrend.map((m) => m.month), [
        { label: "Income", data: primary.monthlyTrend.map((m) => m.income), backgroundColor: "#22c55e44", borderColor: "#22c55e", borderWidth: 2 },
        { label: "Expenses", data: primary.monthlyTrend.map((m) => m.expenses), backgroundColor: "#ef444444", borderColor: "#ef4444", borderWidth: 2 },
      ])
    : null;

  const reviewSection = primary.reviewQueue.length > 0
    ? `<h3 style="color:#f59e0b;margin:24px 0 12px">⚠️ Needs Review (${primary.reviewQueue.length})</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <tr style="color:#94a3b8;border-bottom:1px solid #1e293b">
    <th align="left" style="padding:6px 8px">Description</th>
    <th align="right" style="padding:6px 8px">Amount</th>
    <th align="left" style="padding:6px 8px">Suggested</th>
    <th align="right" style="padding:6px 8px">Confidence</th>
  </tr>
  ${primary.reviewQueue.map((r) => `<tr style="border-bottom:1px solid #1e293b">
    <td style="padding:6px 8px;color:#e2e8f0">${r.description}</td>
    <td align="right" style="padding:6px 8px;color:${r.amount >= 0 ? "#22c55e" : "#f87171"}">${r.amount >= 0 ? "+" : ""}$${Math.abs(r.amount).toFixed(2)}</td>
    <td style="padding:6px 8px;color:#94a3b8">${r.suggestedCategory}</td>
    <td align="right" style="padding:6px 8px;color:#f59e0b">${Math.round(r.confidence * 100)}%</td>
  </tr>`).join("")}
</table>`
    : "";

  const categoryRows = primary.categoryBreakdown.map((c) =>
    `<tr style="border-bottom:1px solid #1e293b">
      <td style="padding:6px 8px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:8px"></span><span style="color:#e2e8f0">${c.name}</span></td>
      <td align="right" style="padding:6px 8px;color:#f87171">$${c.amount.toFixed(2)}</td>
      <td align="right" style="padding:6px 8px;color:#94a3b8">${((c.amount / primary.totalExpenses) * 100).toFixed(1)}%</td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:32px">
      <h1 style="color:#6366f1;font-size:28px;margin:0 0 4px">💰 Finance Report</h1>
      <p style="color:#94a3b8;margin:0">${primary.period} · ${format(new Date(), "MMMM d, yyyy")}</p>
    </div>
    <div style="display:flex;gap:16px;margin-bottom:32px">
      <div style="flex:1;background:#1e293b;border-radius:12px;padding:20px;text-align:center"><div style="color:#94a3b8;font-size:12px;text-transform:uppercase">Income</div><div style="color:#22c55e;font-size:24px;font-weight:700;margin-top:4px">$${primary.totalIncome.toFixed(2)}</div></div>
      <div style="flex:1;background:#1e293b;border-radius:12px;padding:20px;text-align:center"><div style="color:#94a3b8;font-size:12px;text-transform:uppercase">Expenses</div><div style="color:#f87171;font-size:24px;font-weight:700;margin-top:4px">$${primary.totalExpenses.toFixed(2)}</div></div>
      <div style="flex:1;background:#1e293b;border-radius:12px;padding:20px;text-align:center"><div style="color:#94a3b8;font-size:12px;text-transform:uppercase">Net Flow</div><div style="color:${netColor};font-size:24px;font-weight:700;margin-top:4px">${netSign}$${Math.abs(primary.netFlow).toFixed(2)}</div></div>
    </div>
    ${sections.includes("categories") ? `<h3 style="color:#e2e8f0;margin:0 0 16px">Spending by Category</h3><img src="${catChartUrl}" alt="Spending" style="width:100%;border-radius:12px;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px"><tr style="color:#94a3b8;border-bottom:1px solid #1e293b"><th align="left" style="padding:6px 8px">Category</th><th align="right" style="padding:6px 8px">Amount</th><th align="right" style="padding:6px 8px">%</th></tr>${categoryRows}</table>` : ""}
    ${sections.includes("trends") && trendChartUrl ? `<h3 style="color:#e2e8f0;margin:0 0 16px">Monthly Trend</h3><img src="${trendChartUrl}" alt="Trend" style="width:100%;border-radius:12px;margin-bottom:32px">` : ""}
    ${sections.includes("review_queue") ? reviewSection : ""}
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e293b">
      <a href="${appLink}" style="background:#6366f1;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Open App →</a>
      <p style="color:#475569;font-size:12px;margin-top:16px">Manage report settings in the app.</p>
    </div>
  </div>
</body></html>`;
}

export async function sendReport(configId: string): Promise<{ success: boolean; error?: string }> {
  const [config] = await db.select().from(reportConfigs).where(eq(reportConfigs.id, configId)).limit(1);
  if (!config) return { success: false, error: "Config not found" };

  const periods: string[] = JSON.parse(config.periods);
  const sections: string[] = JSON.parse(config.sections);

  try {
    const reportData = await buildReportData(periods);
    const html = buildEmailHtml(reportData, sections, process.env.NEXT_PUBLIC_APP_URL || "");

    const primary = Object.values(reportData)[0];
    const subject = `Finance Report: ${primary.period} (Net ${primary.netFlow >= 0 ? "+" : ""}$${Math.abs(primary.netFlow).toFixed(2)})`;

    if (!process.env.RESEND_API_KEY) {
      await db.insert(reportLogs).values({ configId, email: config.email, subject, status: "failed", error: "RESEND_API_KEY not configured" });
      return { success: false, error: "Email not configured" };
    }

    const { error } = await resend.emails.send({
      from: process.env.REPORT_FROM_EMAIL || "Finance App <onboarding@resend.dev>",
      to: [config.email],
      subject,
      html,
    });

    if (error) {
      await db.insert(reportLogs).values({ configId, email: config.email, subject, status: "failed", error: error.message });
      return { success: false, error: error.message };
    }

    await db.insert(reportLogs).values({ configId, email: config.email, subject, status: "sent" });
    await db.update(reportConfigs).set({ lastSent: new Date() }).where(eq(reportConfigs.id, configId));

    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    await db.insert(reportLogs).values({ configId, email: config.email, subject: "Finance Report", status: "failed", error });
    return { success: false, error };
  }
}
