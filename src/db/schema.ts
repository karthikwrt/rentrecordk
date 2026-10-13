import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'rent-record.db';
const DATABASE_VERSION = 1;

/** Runs on startup (SQLiteProvider onInit) and applies pending migrations. */
export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tenancies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        property_id INTEGER NOT NULL REFERENCES properties(id),
        person_id INTEGER NOT NULL REFERENCES people(id),
        rent_amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        deposit REAL NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenancy_id INTEGER NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        paid_on TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_payments_tenancy ON payments(tenancy_id);
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}

/** Column whitelist per table, used by backup/restore. Order matters for parents first. */
export const TABLE_COLUMNS = {
  properties: ['id', 'mode', 'name', 'address', 'notes', 'created_at'],
  people: ['id', 'mode', 'name', 'phone', 'email', 'notes', 'created_at'],
  tenancies: [
    'id',
    'mode',
    'property_id',
    'person_id',
    'rent_amount',
    'frequency',
    'start_date',
    'end_date',
    'deposit',
    'notes',
    'active',
    'created_at',
  ],
  payments: ['id', 'tenancy_id', 'amount', 'paid_on', 'method', 'notes', 'created_at'],
} as const;

export type TableName = keyof typeof TABLE_COLUMNS;
export const TABLES = Object.keys(TABLE_COLUMNS) as TableName[];
