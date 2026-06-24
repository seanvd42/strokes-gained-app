import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql, { schema });

const {
  accounts,
  transactions,
  categories,
  transactionCategorizations,
  categorizationRules,
  reportConfigs,
  appSettings,
} = schema;

const CATEGORIES = [
  { name: "Salary", type: "INCOME", color: "#22c55e", icon: "briefcase" },
  { name: "Freelance", type: "INCOME", color: "#86efac", icon: "laptop" },
  { name: "Investment Returns", type: "INCOME", color: "#4ade80", icon: "trending-up" },
  { name: "Other Income", type: "INCOME", color: "#bbf7d0", icon: "plus-circle" },
  { name: "Housing", type: "EXPENSE", color: "#6366f1", icon: "home" },
  { name: "Groceries", type: "EXPENSE", color: "#f97316", icon: "shopping-cart" },
  { name: "Restaurants", type: "EXPENSE", color: "#fb923c", icon: "utensils" },
  { name: "Coffee", type: "EXPENSE", color: "#fdba74", icon: "coffee" },
  { name: "Gas", type: "EXPENSE", color: "#ef4444", icon: "fuel" },
  { name: "Car Insurance", type: "EXPENSE", color: "#f87171", icon: "shield" },
  { name: "Parking", type: "EXPENSE", color: "#fca5a5", icon: "map-pin" },
  { name: "Rideshare", type: "EXPENSE", color: "#fecaca", icon: "car" },
  { name: "Streaming", type: "EXPENSE", color: "#8b5cf6", icon: "play" },
  { name: "Entertainment", type: "EXPENSE", color: "#a78bfa", icon: "film" },
  { name: "Shopping", type: "EXPENSE", color: "#ec4899", icon: "shopping-bag" },
  { name: "Amazon", type: "EXPENSE", color: "#f472b6", icon: "package" },
  { name: "Healthcare", type: "EXPENSE", color: "#14b8a6", icon: "heart" },
  { name: "Gym", type: "EXPENSE", color: "#2dd4bf", icon: "dumbbell" },
  { name: "Utilities", type: "EXPENSE", color: "#0ea5e9", icon: "zap" },
  { name: "Internet", type: "EXPENSE", color: "#38bdf8", icon: "wifi" },
  { name: "Subscriptions", type: "EXPENSE", color: "#a855f7", icon: "repeat" },
  { name: "Travel", type: "EXPENSE", color: "#f59e0b", icon: "plane" },
  { name: "Personal Care", type: "EXPENSE", color: "#d946ef", icon: "scissors" },
  { name: "Education", type: "EXPENSE", color: "#10b981", icon: "book" },
  { name: "Gifts", type: "EXPENSE", color: "#f43f5e", icon: "gift" },
  { name: "Uncategorized", type: "EXPENSE", color: "#6b7280", icon: "help-circle" },
  { name: "Transfer", type: "TRANSFER", color: "#94a3b8", icon: "arrow-right-left" },
];

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randDay(year: number, month: number, min: number, max: number): Date {
  const days = new Date(year, month + 1, 0).getDate();
  const day = Math.floor(Math.random() * Math.min(max, days - min + 1)) + min;
  return new Date(year, month, day);
}

const RECURRING = [
  { desc: "DIRECT DEPOSIT - ACME CORP PAYROLL", amount: 4850.00, cat: "Salary", conf: 0.99, method: "RULE", day: 15 },
  { desc: "DIRECT DEPOSIT - ACME CORP PAYROLL", amount: 4850.00, cat: "Salary", conf: 0.99, method: "RULE", day: 30 },
  { desc: "RENT PAYMENT - RIVERSIDE APT", amount: -1850.00, cat: "Housing", conf: 0.99, method: "RULE", day: 1 },
  { desc: "PGE ELECTRIC BILL", amount: -124.50, cat: "Utilities", conf: 0.97, method: "AI", day: 8 },
  { desc: "CITY WATER SERVICES", amount: -45.00, cat: "Utilities", conf: 0.95, method: "AI", day: 10 },
  { desc: "COMCAST INTERNET", amount: -89.99, cat: "Internet", conf: 0.99, method: "RULE", day: 12 },
  { desc: "NETFLIX.COM", amount: -15.49, cat: "Streaming", conf: 0.99, method: "RULE", day: 5 },
  { desc: "SPOTIFY PREMIUM", amount: -9.99, cat: "Streaming", conf: 0.99, method: "RULE", day: 5 },
  { desc: "APPLE ONE", amount: -21.95, cat: "Streaming", conf: 0.97, method: "AI", day: 7 },
  { desc: "HULU SUBSCRIPTION", amount: -17.99, cat: "Streaming", conf: 0.99, method: "RULE", day: 6 },
  { desc: "NYT DIGITAL SUBSCRIPTION", amount: -4.25, cat: "Subscriptions", conf: 0.92, method: "AI", day: 15 },
  { desc: "GEICO AUTO INSURANCE", amount: -167.00, cat: "Car Insurance", conf: 0.99, method: "RULE", day: 3 },
  { desc: "PLANET FITNESS MONTHLY", amount: -24.99, cat: "Gym", conf: 0.99, method: "RULE", day: 18 },
];

type VarTx = { desc: string; amtRange: [number, number]; cat: string; conf: number; method: string; freq: [number, number] };
const VARIABLE: VarTx[] = [
  { desc: "WHOLE FOODS MARKET", amtRange: [-85, -180], cat: "Groceries", conf: 0.98, method: "AI", freq: [2, 3] },
  { desc: "TRADER JOE'S", amtRange: [-45, -110], cat: "Groceries", conf: 0.98, method: "AI", freq: [1, 3] },
  { desc: "KROGER #0412", amtRange: [-35, -95], cat: "Groceries", conf: 0.97, method: "AI", freq: [1, 2] },
  { desc: "CHIPOTLE MEXICAN GRILL", amtRange: [-11, -22], cat: "Restaurants", conf: 0.99, method: "RULE", freq: [1, 4] },
  { desc: "LOCAL BISTRO & BAR", amtRange: [-35, -85], cat: "Restaurants", conf: 0.88, method: "AI", freq: [0, 3] },
  { desc: "DOORDASH*ORDER", amtRange: [-22, -55], cat: "Restaurants", conf: 0.95, method: "AI", freq: [1, 5] },
  { desc: "UBER EATS", amtRange: [-18, -48], cat: "Restaurants", conf: 0.96, method: "AI", freq: [0, 4] },
  { desc: "PANERA BREAD #4521", amtRange: [-12, -28], cat: "Restaurants", conf: 0.99, method: "RULE", freq: [1, 4] },
  { desc: "STARBUCKS #8274", amtRange: [-5, -15], cat: "Coffee", conf: 0.99, method: "RULE", freq: [4, 14] },
  { desc: "BLUE BOTTLE COFFEE", amtRange: [-6, -14], cat: "Coffee", conf: 0.95, method: "AI", freq: [0, 5] },
  { desc: "SHELL OIL #2841", amtRange: [-45, -80], cat: "Gas", conf: 0.98, method: "AI", freq: [0, 2] },
  { desc: "CHEVRON #9921", amtRange: [-40, -75], cat: "Gas", conf: 0.98, method: "AI", freq: [0, 2] },
  { desc: "UBER *TRIP", amtRange: [-12, -38], cat: "Rideshare", conf: 0.99, method: "RULE", freq: [0, 6] },
  { desc: "LYFT *RIDE", amtRange: [-14, -35], cat: "Rideshare", conf: 0.99, method: "RULE", freq: [0, 4] },
  { desc: "AMAZON.COM*PURCHASE", amtRange: [-15, -200], cat: "Amazon", conf: 0.98, method: "RULE", freq: [2, 8] },
  { desc: "TARGET #1247", amtRange: [-25, -120], cat: "Shopping", conf: 0.97, method: "AI", freq: [1, 3] },
  { desc: "COSTCO WHOLESALE #742", amtRange: [-65, -220], cat: "Shopping", conf: 0.96, method: "AI", freq: [0, 2] },
  { desc: "SQ *MOUNTAIN MARKET", amtRange: [-22, -55], cat: "Groceries", conf: 0.62, method: "AI", freq: [0, 2] },
  { desc: "PAYPAL *TRANSFER", amtRange: [-50, -200], cat: "Uncategorized", conf: 0.42, method: "AI", freq: [0, 1] },
  { desc: "ZELLE PAYMENT", amtRange: [-80, -300], cat: "Uncategorized", conf: 0.38, method: "AI", freq: [0, 1] },
  { desc: "VENMO PAYMENT", amtRange: [-25, -150], cat: "Uncategorized", conf: 0.45, method: "AI", freq: [0, 2] },
  { desc: "CVS PHARMACY #2891", amtRange: [-15, -65], cat: "Healthcare", conf: 0.94, method: "AI", freq: [0, 2] },
];

const ONE_OFFS = [
  { desc: "SOUTHWEST AIRLINES", amount: -485.00, cat: "Travel", conf: 0.99, method: "AI", mAgo: 3, day: 10 },
  { desc: "MARRIOTT HOTELS", amount: -620.00, cat: "Travel", conf: 0.99, method: "AI", mAgo: 3, day: 11 },
  { desc: "ENTERPRISE RENT-A-CAR", amount: -245.00, cat: "Travel", conf: 0.98, method: "AI", mAgo: 3, day: 12 },
  { desc: "STRIPE TRANSFER - CLIENT PAYMENT", amount: 1200.00, cat: "Freelance", conf: 0.82, method: "AI", mAgo: 2, day: 15 },
  { desc: "STRIPE TRANSFER - CLIENT PAYMENT", amount: 850.00, cat: "Freelance", conf: 0.78, method: "AI", mAgo: 4, day: 22 },
  { desc: "URGENT CARE - VALLEY MEDICAL", amount: -285.00, cat: "Healthcare", conf: 0.96, method: "AI", mAgo: 1, day: 8 },
  { desc: "LABCORP BILLING", amount: -145.00, cat: "Healthcare", conf: 0.91, method: "AI", mAgo: 1, day: 20 },
  { desc: "UDEMY COURSE PURCHASE", amount: -29.99, cat: "Education", conf: 0.97, method: "AI", mAgo: 2, day: 7 },
  { desc: "ETSY.COM PURCHASE", amount: -78.00, cat: "Gifts", conf: 0.65, method: "AI", mAgo: 1, day: 15 },
  { desc: "FLOWERS BY DESIGN", amount: -65.00, cat: "Gifts", conf: 0.72, method: "AI", mAgo: 2, day: 28 },
  { desc: "FIDELITY INVESTMENTS DIVIDEND", amount: 142.50, cat: "Investment Returns", conf: 0.96, method: "AI", mAgo: 0, day: 15 },
  { desc: "FIDELITY INVESTMENTS DIVIDEND", amount: 142.50, cat: "Investment Returns", conf: 0.96, method: "AI", mAgo: 3, day: 15 },
  { desc: "AMAZON.COM*FURNITURE", amount: -489.00, cat: "Amazon", conf: 0.95, method: "AI", mAgo: 4, day: 5 },
  { desc: "SPORT CLIPS HAIRCUT", amount: -38.00, cat: "Personal Care", conf: 0.97, method: "AI", mAgo: 0, day: 20 },
  { desc: "SPORT CLIPS HAIRCUT", amount: -38.00, cat: "Personal Care", conf: 0.97, method: "AI", mAgo: 2, day: 21 },
];

const RULES = [
  { pattern: "DIRECT DEPOSIT", matchType: "CONTAINS", cat: "Salary", priority: 10 },
  { pattern: "NETFLIX", matchType: "CONTAINS", cat: "Streaming", priority: 9 },
  { pattern: "SPOTIFY", matchType: "CONTAINS", cat: "Streaming", priority: 9 },
  { pattern: "HULU", matchType: "CONTAINS", cat: "Streaming", priority: 9 },
  { pattern: "AMAZON.COM", matchType: "CONTAINS", cat: "Amazon", priority: 8 },
  { pattern: "CHIPOTLE", matchType: "CONTAINS", cat: "Restaurants", priority: 8 },
  { pattern: "STARBUCKS", matchType: "CONTAINS", cat: "Coffee", priority: 8 },
  { pattern: "PANERA", matchType: "CONTAINS", cat: "Restaurants", priority: 8 },
  { pattern: "PLANET FITNESS", matchType: "CONTAINS", cat: "Gym", priority: 8 },
  { pattern: "GEICO", matchType: "CONTAINS", cat: "Car Insurance", priority: 9 },
  { pattern: "COMCAST", matchType: "CONTAINS", cat: "Internet", priority: 9 },
  { pattern: "UBER *TRIP", matchType: "EXACT", cat: "Rideshare", priority: 9 },
  { pattern: "LYFT", matchType: "CONTAINS", cat: "Rideshare", priority: 8 },
  { pattern: "DOORDASH", matchType: "CONTAINS", cat: "Restaurants", priority: 8 },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(schema.reportLogs);
  await db.delete(schema.reportConfigs);
  await db.delete(schema.transactionCategorizations);
  await db.delete(schema.categorizationRules);
  await db.delete(schema.transactions);
  await db.delete(schema.categories);
  await db.delete(schema.accounts);
  await db.delete(schema.appSettings);

  // Categories
  const catRows = await db.insert(categories).values(CATEGORIES).returning();
  const catMap = Object.fromEntries(catRows.map((c) => [c.name, c.id]));
  console.log(`Created ${catRows.length} categories`);

  // Rules
  for (const rule of RULES) {
    if (catMap[rule.cat]) {
      await db.insert(categorizationRules).values({
        pattern: rule.pattern,
        matchType: rule.matchType,
        categoryId: catMap[rule.cat],
        priority: rule.priority,
      });
    }
  }
  console.log(`Created ${RULES.length} rules`);

  // Accounts
  const [checking] = await db.insert(accounts).values({ name: "Chase Checking", org: "Chase", currency: "USD", balance: 4821.33 }).returning();
  await db.insert(accounts).values({ name: "Chase Savings", org: "Chase", currency: "USD", balance: 18450.00 });
  const [credit] = await db.insert(accounts).values({ name: "Chase Sapphire Preferred", org: "Chase", currency: "USD", balance: -1284.22 }).returning();
  console.log("Created 3 accounts");

  const today = new Date();
  let txCount = 0;

  // Helper to insert transaction + categorization
  async function insertTx(accountId: string, date: Date, amount: number, desc: string, catName: string, conf: number, method: string) {
    if (date > today) return;
    const catId = catMap[catName] || catMap["Uncategorized"];
    if (!catId) return;
    const clampedConf = Math.max(0.1, Math.min(0.99, conf + (Math.random() * 0.04 - 0.02)));
    const [tx] = await db.insert(transactions).values({ accountId, date, amount, description: desc, pending: false }).returning();
    await db.insert(transactionCategorizations).values({
      transactionId: tx.id,
      categoryId: catId,
      confidence: clampedConf,
      method,
      aiExplanation: method === "AI" ? `Categorized as "${catName}" based on merchant pattern.` : "",
      needsReview: clampedConf < 0.75,
    });
    txCount++;
  }

  // Generate 6 months of transactions
  for (let mAgo = 0; mAgo < 6; mAgo++) {
    const monthDate = subMonths(today, mAgo);
    const yr = monthDate.getFullYear();
    const mo = monthDate.getMonth();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();

    // Recurring
    for (const tx of RECURRING) {
      const day = Math.min(tx.day, daysInMonth);
      const acct = tx.amount > 0 ? checking.id : credit.id;
      await insertTx(acct, new Date(yr, mo, day), tx.amount, tx.desc, tx.cat, tx.conf, tx.method);
    }

    // Variable
    for (const tx of VARIABLE) {
      const count = Math.floor(Math.random() * (tx.freq[1] - tx.freq[0] + 1)) + tx.freq[0];
      for (let i = 0; i < count; i++) {
        const date = randDay(yr, mo, 1, 28);
        const amount = rand(tx.amtRange[0], tx.amtRange[1]);
        await insertTx(credit.id, date, amount, tx.desc, tx.cat, tx.conf, tx.method);
      }
    }
  }

  // One-offs
  for (const tx of ONE_OFFS) {
    const d = subMonths(today, tx.mAgo);
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const days = new Date(yr, mo + 1, 0).getDate();
    const day = Math.min(tx.day, days);
    const acct = tx.amount > 0 ? checking.id : credit.id;
    await insertTx(acct, new Date(yr, mo, day), tx.amount, tx.desc, tx.cat, tx.conf, tx.method);
  }

  console.log(`Created ${txCount} transactions`);

  // Report configs
  await db.insert(reportConfigs).values([
    {
      name: "Weekly Digest",
      frequency: "WEEKLY",
      dayOfWeek: 1,
      email: "sean.j.van.duser@gmail.com",
      periods: JSON.stringify(["1m"]),
      sections: JSON.stringify(["overview", "categories", "review_queue"]),
      enabled: true,
      isDefault: true,
    },
    {
      name: "Monthly Summary",
      frequency: "MONTHLY",
      dayOfMonth: 1,
      email: "sean.j.van.duser@gmail.com",
      periods: JSON.stringify(["1m", "3m", "6m"]),
      sections: JSON.stringify(["overview", "categories", "trends", "outliers", "review_queue"]),
      enabled: true,
      isDefault: true,
    },
  ]);

  // App settings
  await db.insert(appSettings).values([
    { key: "CONFIDENCE_THRESHOLD", value: "0.75" },
    { key: "DEFAULT_CURRENCY", value: "USD" },
    { key: "TIMEZONE", value: "America/Chicago" },
  ]);

  console.log("\nSeed complete!");
  console.log(`  Accounts: 3, Categories: ${catRows.length}, Transactions: ${txCount}`);
  console.log("  Default password: demo1234");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
