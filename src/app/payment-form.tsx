import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { deletePayment, getPayment, getTenancy, savePayment } from '@/db/queries';
import { todayISO } from '@/lib/dates';
import { formatINR, parseAmount } from '@/lib/money';
import { FREQUENCY_UNIT, rentStatus } from '@/lib/rent';
import { useAppState, useDbQuery, useModeLabels } from '@/state/app-state';

type FormState = { amount: string; paid_on: string; method: string; notes: string };

/** Records rent collected (owner) / paid (tenant) against a tenancy. */
export default function PaymentFormScreen() {
  const params = useLocalSearchParams<{ tenancyId: string; id?: string }>();
  const tenancyId = Number(params.tenancyId);
  const editId = params.id ? Number(params.id) : undefined;

  const data = useDbQuery(
    async (db) => {
      const [tenancy, existing] = await Promise.all([
        getTenancy(db, tenancyId),
        editId ? getPayment(db, editId) : Promise.resolve(null),
      ]);
      return { tenancy, existing };
    },
    [tenancyId, editId]
  );

  if (!data) return <Loading />;
  const { tenancy, existing } = data;
  if (!tenancy) {
    return (
      <Screen>
        <EmptyState title="Not found" message="This tenancy no longer exists." />
      </Screen>
    );
  }

  const balance = rentStatus(tenancy).balance;
  const suggested = balance > 0 ? balance : tenancy.rent_amount;

  return (
    <PaymentForm
      tenancyId={tenancyId}
      editId={editId}
      summary={`${tenancy.property_name} · ${tenancy.person_name}`}
      detail={`${formatINR(tenancy.rent_amount)} / ${FREQUENCY_UNIT[tenancy.frequency]}${
        balance > 0 ? ` · ${formatINR(balance)} due` : ''
      }`}
      initial={
        existing
          ? {
              amount: String(existing.amount),
              paid_on: existing.paid_on,
              method: existing.method,
              notes: existing.notes,
            }
          : { amount: String(suggested), paid_on: todayISO(), method: '', notes: '' }
      }
    />
  );
}

function PaymentForm({
  tenancyId,
  editId,
  summary,
  detail,
  initial,
}: {
  tenancyId: number;
  editId?: number;
  summary: string;
  detail: string;
  initial: FormState;
}) {
  const db = useSQLiteContext();
  const { notifyDataChanged } = useAppState();
  const labels = useModeLabels();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    const amount = parseAmount(form.amount);
    if (!(amount > 0)) {
      setError('Enter the amount');
      return;
    }
    setSaving(true);
    try {
      await savePayment(
        db,
        tenancyId,
        { amount, paid_on: form.paid_on, method: form.method.trim(), notes: form.notes.trim() },
        editId
      );
      notifyDataChanged();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!editId) return;
    Alert.alert('Delete payment?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(db, editId);
          notifyDataChanged();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: editId ? 'Edit payment' : labels.recordPayment }} />
      <Card>
        <ThemedText type="smallBold">{summary}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </Card>
      <Field
        label="Amount (₹) *"
        value={form.amount}
        onChangeText={(v) => update('amount', v)}
        keyboardType="decimal-pad"
        error={error}
        selectTextOnFocus
      />
      <DateField
        label={`Date ${labels.moneyVerb}`}
        value={form.paid_on}
        onChange={(v) => update('paid_on', v)}
      />
      <Field
        label="Method"
        value={form.method}
        onChangeText={(v) => update('method', v)}
        placeholder="Cash, UPI, bank transfer…"
      />
      <Field label="Notes" value={form.notes} onChangeText={(v) => update('notes', v)} multiline />
      <Button title="Save" onPress={onSave} loading={saving} />
      {editId ? <Button title="Delete payment" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
