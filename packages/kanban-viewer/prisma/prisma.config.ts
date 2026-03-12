import path from 'node:path';
import { defineConfig } from 'prisma/config';

const dbUrl = process.env.DATABASE_URL ?? 'file:./data/dev.db';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async adapter(datasourceUrl: string) {
      const { createClient } = await import('@libsql/client');
      const { PrismaLibSql } = await import('@prisma/adapter-libsql');
      const client = createClient({ url: datasourceUrl });
      return new PrismaLibSql(client);
    },
  },
  datasource: {
    url: dbUrl,
  },
});
