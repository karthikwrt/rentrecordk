import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Linking, Pressable } from 'react-native';

import { LinkedDetail } from '@/components/linked-detail';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, InfoRow, Loading, Screen } from '@/components/ui';
import { deletePerson, getPerson, listTenanciesFor } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { useDbQuery, useModeLabels } from '@/state/app-state';

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const db = useSQLiteContext();
  const theme = useTheme();
  const labels = useModeLabels();

  const data = useDbQuery(
    async (db) => {
      const [person, tenancies] = await Promise.all([
        getPerson(db, personId),
        listTenanciesFor(db, 'person_id', personId),
      ]);
      return { person, tenancies };
    },
    [personId]
  );

  if (!data) return <Loading />;
  const { person, tenancies } = data;
  if (!person) {
    return (
      <Screen>
        <EmptyState title="Not found" message="This record no longer exists." />
      </Screen>
    );
  }

  const link = (text: string, url: string) => (
    <Pressable onPress={() => Linking.openURL(url)}>
      <ThemedText type="smallBold" style={{ color: theme.tint }}>
        {text}
      </ThemedText>
    </Pressable>
  );

  return (
    <LinkedDetail
      title={person.name}
      kind={labels.person.toLowerCase()}
      recordId={person.id}
      linkColumn="person_id"
      tenancies={tenancies}
      editHref={{ pathname: '/person-form', params: { id: String(person.id) } }}
      newTenancyHref={{ pathname: '/tenancy-form', params: { personId: String(person.id) } }}
      onDelete={() => deletePerson(db, person.id)}
      info={
        <>
          <InfoRow label="Name" value={person.name} />
          <InfoRow label="Phone" value={person.phone ? link(person.phone, `tel:${person.phone}`) : '—'} />
          <InfoRow
            label="Email"
            value={person.email ? link(person.email, `mailto:${person.email}`) : '—'}
          />
          {person.notes ? <InfoRow label="Notes" value={person.notes} /> : null}
        </>
      }
    />
  );
}
