import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { DateField } from '@/components/date-field';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { Button, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { getTenancy, listPeople, listProperties, saveTenancy } from '@/db/queries';
import { FREQUENCIES, type Frequency, type Person, type Property } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';
import { parseAmount } from '@/lib/money';
import { FREQUENCY_LABEL } from '@/lib/rent';
import { useAppState, useDbQuery, useModeLabels } from '@/state/app-state';

type FormState = {
  property_id: number;
  person_id: number;
  rent: string;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  deposit: string;
  notes: string;
};

/** Links a property with a tenant/owner and sets the rent terms. */
export default function TenancyFormScreen() {
  const params = useLocalSearchParams<{ id?: string; propertyId?: string; personId?: string }>();
  const editId = params.id ? Number(params.id) : undefined;
  const labels = useModeLabels();

  const data = useDbQuery(
    async (db, mode) => {
      const [properties, people, existing] = await Promise.all([
        listProperties(db, mode),
        listPeople(db, mode),
        editId ? getTenancy(db, editId) : Promise.resolve(null),
      ]);
      return { properties, people, existing };
    },
    [editId]
  );

  if (!data) return <Loading />;
  const { properties, people, existing } = data;

  if (properties.length === 0 || people.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'New tenancy' }} />
        <EmptyState
          title="Add records first"
          message={`A tenancy needs at least one property and one ${labels.person.toLowerCase()}. Add them in the Properties and ${labels.people} tabs.`}
        />
        {properties.length === 0 ? (
          <Button title="+ Add property" onPress={() => router.replace('/property-form')} />
        ) : null}
        {people.length === 0 ? (
          <Button
            title={`+ Add ${labels.person.toLowerCase()}`}
            variant={properties.length === 0 ? 'secondary' : 'primary'}
            onPress={() => router.replace('/person-form')}
          />
        ) : null}
      </Screen>
    );
  }

  const pick = (wanted: string | undefined, list: { id: number }[]) =>
    list.find((x) => String(x.id) === wanted)?.id ?? list[0]!.id;

  const initial: FormState = existing
    ? {
        property_id: existing.property_id,
        person_id: existing.person_id,
        rent: String(existing.rent_amount),
        frequency: existing.frequency,
        start_date: existing.start_date,
        end_date: existing.end_date,
        deposit: existing.deposit ? String(existing.deposit) : '',
        notes: existing.notes,
      }
    : {
        property_id: pick(params.propertyId, properties),
        person_id: pick(params.personId, people),
        rent: '',
        frequency: 'monthly',
        start_date: todayISO(),
        end_date: null,
        deposit: '',
        notes: '',
      };

  return (
    <TenancyForm editId={editId} initial={initial} properties={properties} people={people} />
  );
}

function TenancyForm({
  editId,
  initial,
  properties,
  people,
}: {
  editId?: number;
  initial: FormState;
  properties: Property[];
  people: Person[];
}) {
  const db = useSQLiteContext();
  const { mode, notifyDataChanged } = useAppState();
  const labels = useModeLabels();
  const theme = useTheme();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<{ rent?: string; deposit?: string; end?: string }>({});
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    const rent = parseAmount(form.rent);
    const deposit = form.deposit.trim() ? parseAmount(form.deposit) : 0;
    const next: typeof errors = {};
    if (!(rent > 0)) next.rent = 'Enter the rent amount';
    if (Number.isNaN(deposit) || deposit < 0) next.deposit = 'Enter a valid amount';
    if (form.end_date && form.end_date < form.start_date)
      next.end = 'End date must be after the start date';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const id = await saveTenancy(
        db,
        mode,
        {
          property_id: form.property_id,
          person_id: form.person_id,
          rent_amount: rent,
          frequency: form.frequency,
          start_date: form.start_date,
          end_date: form.end_date,
          deposit,
          notes: form.notes.trim(),
        },
        editId
      );
      notifyDataChanged();
      if (editId) {
        router.back();
      } else {
        router.dismiss();
        router.push({ pathname: '/tenancies/[id]', params: { id: String(id) } });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: editId ? 'Edit tenancy' : 'New tenancy' }} />
      <SelectField
        label="Property"
        value={form.property_id}
        options={properties.map((p) => ({ label: p.name, value: p.id }))}
        onChange={(v) => update('property_id', v)}
      />
      <SelectField
        label={labels.person}
        value={form.person_id}
        options={people.map((p) => ({ label: p.name, value: p.id }))}
        onChange={(v) => update('person_id', v)}
      />
      <Field
        label="Rent amount (₹) *"
        value={form.rent}
        onChangeText={(v) => update('rent', v)}
        keyboardType="decimal-pad"
        placeholder="e.g. 15000"
        error={errors.rent}
      />
      <SelectField
        label="Rent frequency"
        value={form.frequency}
        options={FREQUENCIES.map((f) => ({ label: FREQUENCY_LABEL[f], value: f }))}
        onChange={(v) => update('frequency', v)}
      />
      <DateField
        label="Start date (rent is due from this day)"
        value={form.start_date}
        onChange={(v) => update('start_date', v)}
      />
      <DateField
        label="End date (optional)"
        value={form.end_date}
        placeholder="No end date"
        minimumDate={form.start_date}
        onChange={(v) => update('end_date', v)}
        onClear={() => update('end_date', null)}
      />
      {errors.end ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {errors.end}
        </ThemedText>
      ) : null}
      <Field
        label="Security deposit (₹)"
        value={form.deposit}
        onChangeText={(v) => update('deposit', v)}
        keyboardType="decimal-pad"
        placeholder="0"
        error={errors.deposit}
      />
      <Field label="Notes" value={form.notes} onChangeText={(v) => update('notes', v)} multiline />
      <Button title="Save" onPress={onSave} loading={saving} />
    </Screen>
  );
}
