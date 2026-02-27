import { Global, Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DRIZZLE_DB, SQLITE_CLIENT } from '@db/database.constants';
import type { DrizzleDatabase, SQLiteClient } from '@db/database.types';
import * as schema from '@db/schema';

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? './data/app.db';
}

function ensureDatabaseDir(databaseUrl: string) {
  if (databaseUrl === ':memory:' || databaseUrl.startsWith('file:')) {
    return;
  }

  const directory = dirname(databaseUrl);
  if (directory !== '.') {
    mkdirSync(directory, { recursive: true });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: SQLITE_CLIENT,
      useFactory: (): SQLiteClient => {
        const databaseUrl = resolveDatabaseUrl();
        ensureDatabaseDir(databaseUrl);
        const sqlite = new Database(databaseUrl);
        sqlite.pragma('journal_mode = WAL');
        return sqlite;
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [SQLITE_CLIENT],
      useFactory: (sqlite: SQLiteClient): DrizzleDatabase => {
        const db = drizzle(sqlite, { schema });
        migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
        return db;
      },
    },
  ],
  exports: [SQLITE_CLIENT, DRIZZLE_DB],
})
export class DatabaseModule {}
