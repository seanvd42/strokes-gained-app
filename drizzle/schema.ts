import {
  pgTable,
  text,
  real,
  boolean,
  timestamp,
  integer,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  simplefinId: text("simplefin_id").unique(),
  name: text("name").notNull(),
  org: text("org").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  balance: real("balance").notNull().default(0),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  simplefinId: text("simplefin_id").unique(),
  accountId: text("account_id").notNull().references(() => accounts.id),
  date: timestamp("date").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  pending: boolean("pending").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // INCOME | EXPENSE | TRANSFER
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("circle"),
  parentId: text("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionCategorizations = pgTable("transaction_categorizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionId: text("transaction_id").notNull().unique().references(() => transactions.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id),
  confidence: real("confidence").notNull(),
  method: text("method").notNull(), // AI | MANUAL | RULE
  aiExplanation: text("ai_explanation").notNull().default(""),
  needsReview: boolean("needs_review").notNull().default(false),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categorizationRules = pgTable("categorization_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pattern: text("pattern").notNull(),
  matchType: text("match_type").notNull(), // CONTAINS | EXACT | REGEX
  categoryId: text("category_id").notNull().references(() => categories.id),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reportConfigs = pgTable("report_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(), // WEEKLY | MONTHLY | QUARTERLY
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  email: text("email").notNull(),
  periods: text("periods").notNull(), // JSON array
  sections: text("sections").notNull(), // JSON array
  enabled: boolean("enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  lastSent: timestamp("last_sent"),
  nextSend: timestamp("next_send"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reportLogs = pgTable("report_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  configId: text("config_id").references(() => reportConfigs.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // sent | failed
  error: text("error").notNull().default(""),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  categorization: one(transactionCategorizations, { fields: [transactions.id], references: [transactionCategorizations.transactionId] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  categorizations: many(transactionCategorizations),
  rules: many(categorizationRules),
}));

export const transactionCategorizationsRelations = relations(transactionCategorizations, ({ one }) => ({
  transaction: one(transactions, { fields: [transactionCategorizations.transactionId], references: [transactions.id] }),
  category: one(categories, { fields: [transactionCategorizations.categoryId], references: [categories.id] }),
}));

export const categorizationRulesRelations = relations(categorizationRules, ({ one }) => ({
  category: one(categories, { fields: [categorizationRules.categoryId], references: [categories.id] }),
}));

export const reportConfigsRelations = relations(reportConfigs, ({ many }) => ({
  logs: many(reportLogs),
}));

export const reportLogsRelations = relations(reportLogs, ({ one }) => ({
  config: one(reportConfigs, { fields: [reportLogs.configId], references: [reportConfigs.id] }),
}));
