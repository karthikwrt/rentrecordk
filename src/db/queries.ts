import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Frequency,
  Mode,
  Payment,
  PaymentView,
  Person,
  Property,
  TenancyView,
} from './types';

// ---------- Properties ----------

export function listProperties(db: SQLiteDatabase, mode: Mode) {
  return db.getAllAsync<Property>('SELECT * FROM properties WHERE mode = ? ORDER BY name', mode);
}

export function getProperty(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Property>('SELECT * FROM properties WHERE id = ?', id);
}

export type PropertyInput = Pick<Property, 'name' | 'address' | 'notes'>;

export async function saveProperty(
  db: SQLiteDatabase,
  mode: Mode,
  input: PropertyInput,
  id?: number
) {
  if (id) {
    await db.runAsync(
      'UPDATE properties SET name = ?, address = ?, notes = ? WHERE id = ?',
      input.name,
      input.address,
      input.notes,
      id
    );
    return id;
  }
  const result = await db.runAsync(
    'INSERT INTO properties (mode, name, address, notes) VALUES (?, ?, ?, ?)',
    mode,
    input.name,
    input.address,
    input.notes
  );
  return result.lastInsertRowId;
}

// ---------- People (tenants / owners) ----------

export function listPeople(db: SQLiteDatabase, mode: Mode) {
  return db.getAllAsync<Person>('SELECT * FROM people WHERE mode = ? ORDER BY name', mode);
}

export function getPerson(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Person>('SELECT * FROM people WHERE id = ?', id);
}

export type PersonInput = Pick<Person, 'name' | 'phone' | 'email' | 'notes'>;

export async function savePerson(db: SQLiteDatabase, mode: Mode, input: PersonInput, id?: number) {
  if (id) {
    await db.runAsync(
      'UPDATE people SET name = ?, phone = ?, email = ?, notes = ? WHERE id = ?',
      input.name,
      input.phone,
      input.email,
      input.notes,
      id
    );
    return id;
  }
  const result = await db.runAsync(
    'INSERT INTO people (mode, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)',
    mode,
    input.name,
    input.phone,
    input.email,
    input.notes
  );
  return result.lastInsertRowId;
}

// ---------- Deleting properties / people ----------

/** Number of tenancies (any status) that reference this property or person. */
export async function countLinkedTenancies(
  db: SQLiteDatabase,
  column: 'property_id' | 'person_id',
  id: number
) {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tenancies WHERE ${column} = ?`,
    id
  );
  return row?.n ?? 0;
}

export async function deleteProperty(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM properties WHERE id = ?', id);
}

export async function deletePerson(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM people WHERE id = ?', id);
}

// ---------- Tenancies ----------

const TENANCY_VIEW_SQL = `
  SELECT t.*,
    pr.name AS property_name,
    pe.name AS person_name,
    COALESCE((SELECT SUM(amount) FROM payments WHERE tenancy_id = t.id), 0) AS total_paid
  FROM tenancies t
  JOIN properties pr ON pr.id = t.property_id
  JOIN people pe ON pe.id = t.person_id
`;

export function listTenancies(db: SQLiteDatabase, mode: Mode) {
  return db.getAllAsync<TenancyView>(
    `${TENANCY_VIEW_SQL} WHERE t.mode = ? ORDER BY t.active DESC, pr.name`,
    mode
  );
}

export function listTenanciesFor(
  db: SQLiteDatabase,
  column: 'property_id' | 'person_id',
  id: number
) {
  return db.getAllAsync<TenancyView>(
    `${TENANCY_VIEW_SQL} WHERE t.${column} = ? ORDER BY t.active DESC, t.start_date DESC`,
    id
  );
}

export function getTenancy(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<TenancyView>(`${TENANCY_VIEW_SQL} WHERE t.id = ?`, id);
}

export type TenancyInput = {
  property_id: number;
  person_id: number;
  rent_amount: number;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  deposit: number;
  notes: string;
};

export async function saveTenancy(
  db: SQLiteDatabase,
  mode: Mode,
  input: TenancyInput,
  id?: number
) {
  const values = [
    input.property_id,
    input.person_id,
    input.rent_amount,
    input.frequency,
    input.start_date,
    input.end_date,
    input.deposit,
    input.notes,
  ];
  if (id) {
    await db.runAsync(
      `UPDATE tenancies SET property_id = ?, person_id = ?, rent_amount = ?, frequency = ?,
        start_date = ?, end_date = ?, deposit = ?, notes = ? WHERE id = ?`,
      ...values,
      id
    );
    return id;
  }
  const result = await db.runAsync(
    `INSERT INTO tenancies (mode, property_id, person_id, rent_amount, frequency, start_date,
      end_date, deposit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    mode,
    ...values
  );
  return result.lastInsertRowId;
}

export async function setTenancyActive(
  db: SQLiteDatabase,
  id: number,
  active: boolean,
  endDate: string | null
) {
  await db.runAsync(
    'UPDATE tenancies SET active = ?, end_date = ? WHERE id = ?',
    active ? 1 : 0,
    endDate,
    id
  );
}

export async function deleteTenancy(db: SQLiteDatabase, id: number) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM payments WHERE tenancy_id = ?', id);
    await txn.runAsync('DELETE FROM tenancies WHERE id = ?', id);
  });
}

// ---------- Payments ----------

const PAYMENT_VIEW_SQL = `
  SELECT p.*, pr.name AS property_name, pe.name AS person_name
  FROM payments p
  JOIN tenancies t ON t.id = p.tenancy_id
  JOIN properties pr ON pr.id = t.property_id
  JOIN people pe ON pe.id = t.person_id
`;

export function listPayments(db: SQLiteDatabase, tenancyId: number) {
  return db.getAllAsync<PaymentView>(
    `${PAYMENT_VIEW_SQL} WHERE p.tenancy_id = ? ORDER BY p.paid_on DESC, p.id DESC`,
    tenancyId
  );
}

export function listRecentPayments(db: SQLiteDatabase, mode: Mode, limit = 10) {
  return db.getAllAsync<PaymentView>(
    `${PAYMENT_VIEW_SQL} WHERE t.mode = ? ORDER BY p.paid_on DESC, p.id DESC LIMIT ?`,
    mode,
    limit
  );
}

/** Sum of payments in the given date range (inclusive, YYYY-MM-DD). */
export async function sumPaymentsBetween(db: SQLiteDatabase, mode: Mode, from: string, to: string) {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(p.amount), 0) AS total FROM payments p
     JOIN tenancies t ON t.id = p.tenancy_id
     WHERE t.mode = ? AND p.paid_on BETWEEN ? AND ?`,
    mode,
    from,
    to
  );
  return row?.total ?? 0;
}

export function getPayment(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Payment>('SELECT * FROM payments WHERE id = ?', id);
}

export type PaymentInput = Pick<Payment, 'amount' | 'paid_on' | 'method' | 'notes'>;

export async function savePayment(
  db: SQLiteDatabase,
  tenancyId: number,
  input: PaymentInput,
  id?: number
) {
  if (id) {
    await db.runAsync(
      'UPDATE payments SET amount = ?, paid_on = ?, method = ?, notes = ? WHERE id = ?',
      input.amount,
      input.paid_on,
      input.method,
      input.notes,
      id
    );
    return id;
  }
  const result = await db.runAsync(
    'INSERT INTO payments (tenancy_id, amount, paid_on, method, notes) VALUES (?, ?, ?, ?, ?)',
    tenancyId,
    input.amount,
    input.paid_on,
    input.method,
    input.notes
  );
  return result.lastInsertRowId;
}

export async function deletePayment(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM payments WHERE id = ?', id);
}
