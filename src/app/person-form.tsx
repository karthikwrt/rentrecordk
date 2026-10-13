import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button, Field, Loading, Screen } from '@/components/ui';
import { getPerson, savePerson, type PersonInput } from '@/db/queries';
import { useAppState, useDbQuery, useModeLabels } from '@/state/app-state';

/** Add/edit a tenant (owner mode) or an owner (tenant mode). */
export default function PersonFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : undefined;
  const existing = useDbQuery(async (db) => (editId ? await getPerson(db, editId) : null), [editId]);

  if (existing === undefined) return <Loading />;
  return (
    <PersonForm
      editId={editId}
      initial={{
        name: existing?.name ?? '',
        phone: existing?.phone ?? '',
        email: existing?.email ?? '',
        notes: existing?.notes ?? '',
      }}
    />
  );
}

function PersonForm({ editId, initial }: { editId?: number; initial: PersonInput }) {
  const db = useSQLiteContext();
  const { mode, notifyDataChanged } = useAppState();
  const labels = useModeLabels();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PersonInput) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    if (!form.name.trim()) {
      setError('Enter a name');
      return;
    }
    setSaving(true);
    try {
      await savePerson(
        db,
        mode,
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
        },
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
      <Stack.Screen
        options={{ title: `${editId ? 'Edit' : 'New'} ${labels.person.toLowerCase()}` }}
      />
      <Field
        label="Name *"
        value={form.name}
        onChangeText={set('name')}
        error={error}
        autoFocus={!editId}
        autoCapitalize="words"
      />
      <Field
        label="Phone"
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
      />
      <Field
        label="Email"
        value={form.email}
        onChangeText={set('email')}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field label="Notes" value={form.notes} onChangeText={set('notes')} multiline />
      <Button title="Save" onPress={onSave} loading={saving} />
    </Screen>
  );
}
