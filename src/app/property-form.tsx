import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button, Field, Loading, Screen } from '@/components/ui';
import { getProperty, saveProperty, type PropertyInput } from '@/db/queries';
import { useAppState, useDbQuery } from '@/state/app-state';

export default function PropertyFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : undefined;
  const existing = useDbQuery(
    async (db) => (editId ? await getProperty(db, editId) : null),
    [editId]
  );

  if (existing === undefined) return <Loading />;
  return (
    <PropertyForm
      editId={editId}
      initial={{
        name: existing?.name ?? '',
        address: existing?.address ?? '',
        notes: existing?.notes ?? '',
      }}
    />
  );
}

function PropertyForm({ editId, initial }: { editId?: number; initial: PropertyInput }) {
  const db = useSQLiteContext();
  const { mode, notifyDataChanged } = useAppState();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PropertyInput) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    if (!form.name.trim()) {
      setError('Enter a name for the property');
      return;
    }
    setSaving(true);
    try {
      await saveProperty(
        db,
        mode,
        { name: form.name.trim(), address: form.address.trim(), notes: form.notes.trim() },
        editId
      );
      notifyDataChanged();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: editId ? 'Edit property' : 'New property' }} />
      <Field
        label="Name *"
        value={form.name}
        onChangeText={set('name')}
        placeholder="e.g. Flat 2B, Green Residency"
        error={error}
        autoFocus={!editId}
      />
      <Field
        label="Address"
        value={form.address}
        onChangeText={set('address')}
        placeholder="Street, area, city"
        multiline
      />
      <Field label="Notes" value={form.notes} onChangeText={set('notes')} multiline />
      <Button title="Save" onPress={onSave} loading={saving} />
    </Screen>
  );
}
