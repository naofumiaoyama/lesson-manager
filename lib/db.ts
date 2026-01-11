import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/drizzle/schema";

// DB の遅延初期化（ビルド時にエラーを回避）
let dbInstance: NodePgDatabase<typeof schema> | null = null;
let poolInstance: Pool | null = null;

function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    dbInstance = drizzle(poolInstance, { schema });
  }
  return dbInstance;
}

// 後方互換性のためのプロキシを使用
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof NodePgDatabase<typeof schema>];
  },
});
