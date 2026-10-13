import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { TABLE_COLUMNS, TABLES, type TableName } from '@/db/schema';

import { todayISO } from './dates';

const BACKUP_APP = 'rent-record';
const BACKUP_VERSION = 1;

type Row = Record<string, unknown>;
type BackupFile = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<TableName, Row[]>;
};

/** Writes every table to a JSON file and opens the share sheet (choose Google Drive to save it). */
export async function exportBackup(db: SQLiteDatabase) {
  const data = {} as Record<TableName, Row[]>;
  for (const table of TABLES) {
    data[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table} ORDER BY id`);
  }
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };

  const file = new File(Paths.cache, `rent-record-backup-${todayISO()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save backup to Google Drive',
  });
}

export type PickedBackup = { backup: BackupFile; counts: Record<TableName, number> };

/** Lets the user pick a backup file and validates it. Returns null if cancelled. */
export async function pickBackup(): Promise<PickedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;

  const text = await new File(result.assets[0].uri).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid backup.');
  }

  const backup = parsed as Partial<BackupFile>;
  if (backup.app !== BACKUP_APP || typeof backup.data !== 'object' || !backup.data) {
    throw new Error('That file is not a Rent Record backup.');
  }
  if ((backup.version ?? 0) > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  const counts = {} as Record<TableName, number>;
  for (const table of TABLES) {
    const rows = backup.data[table];
    if (!Array.isArray(rows)) throw new Error(`Backup is missing "${table}".`);
    counts[table] = rows.length;
  }
  return { backup: backup as BackupFile, counts };
}

/** Replaces all current data with the backup contents in a single transaction. */
export async function restoreBackup(db: SQLiteDatabase, backup: BackupFile) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const table of [...TABLES].reverse()) {
      await txn.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of TABLES) {
      const columns = TABLE_COLUMNS[table];
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns
        .map(() => '?')
        .join(', ')})`;
      for (const row of backup.data[table]) {
        const values = columns.map((c) => {
          const v = row[c];
          return v === undefined ? null : (v as string | number | null);
        });
        await txn.runAsync(sql, values);
      }
    }
  });
}
