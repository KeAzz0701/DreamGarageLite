// This config targets the master (company directory) database, separate from
// the per-company operational database used by prisma.config.ts.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma-master/schema.prisma",
  migrations: {
    path: "prisma-master/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL_MASTER"),
  },
});
