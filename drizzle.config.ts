import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

if (!process.env.DB_TYPE) {
  throw new Error("DB_TYPE must be either 'postgres' or 'mysql'");
}

const dbType = process.env.DB_TYPE.toLowerCase();
if (dbType !== 'postgres' && dbType !== 'mysql') {
  throw new Error("DB_TYPE must be either 'postgres' or 'mysql'");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: dbType === 'postgres' ? "postgresql" : "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
