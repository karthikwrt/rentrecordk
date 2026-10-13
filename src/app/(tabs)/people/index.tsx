import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button, EmptyState, Loading, PressableCard, Screen } from '@/components/ui';
import { listPeople } from '@/db/queries';
import { useDbQuery, useModeLabels } from '@/state/app-state';

/** Tenants (owner mode) or Owners (tenant mode). */
export default function PeopleScreen() {
  const labels = useModeLabels();
  const people = useDbQuery((db, mode) => listPeople(db, mode));

  if (!people) return <Loading />;

  return (
    <Screen>
      <Button title={`+ Add ${labels.person.toLowerCase()}`} onPress={() => router.push('/person-form')} />
      {people.length === 0 ? (
        <EmptyState
          title={`No ${labels.people.toLowerCase()} yet`}
          message={`Add ${labels.aPerson} so you can link them to a property.`}
        />
      ) : (
        people.map((p) => (
          <PressableCard
            key={p.id}
            onPress={() => router.push({ pathname: '/people/[id]', params: { id: String(p.id) } })}>
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>
              {p.name}
            </ThemedText>
            {p.phone || p.email ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {[p.phone, p.email].filter(Boolean).join(' · ')}
              </ThemedText>
            ) : null}
          </PressableCard>
        ))
      )}
    </Screen>
  );
}
