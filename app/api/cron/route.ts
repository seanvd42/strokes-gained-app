import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportConfigs } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendReport } from "@/lib/email";
import { getDay, getDate } from "date-fns";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = getDay(now);
  const dayOfMonth = getDate(now);

  const configs = await db.select().from(reportConfigs).where(eq(reportConfigs.enabled, true));

  const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

  for (const config of configs) {
    let shouldSend = false;
    if (config.frequency === "WEEKLY" && config.dayOfWeek === dayOfWeek) shouldSend = true;
    else if (config.frequency === "MONTHLY" && config.dayOfMonth === dayOfMonth) shouldSend = true;
    else if (config.frequency === "QUARTERLY") {
      const isQ = [1, 4, 7, 10].includes(now.getMonth() + 1);
      if (isQ && config.dayOfMonth === dayOfMonth) shouldSend = true;
    }

    if (shouldSend) {
      const result = await sendReport(config.id);
      results.push({ id: config.id, name: config.name, ...result });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
