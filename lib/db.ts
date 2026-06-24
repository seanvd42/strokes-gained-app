import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";

const globalForDb = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? "require" : false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { sql };
