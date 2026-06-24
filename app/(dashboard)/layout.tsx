import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { transactionCategorizations } from "@/drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionCategorizations)
    .where(and(eq(transactionCategorizations.needsReview, true), isNull(transactionCategorizations.reviewedAt)));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar reviewCount={Number(count)} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
