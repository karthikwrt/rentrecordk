import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button, EmptyState, Loading, PressableCard, Screen } from '@/components/ui';
import { listProperties } from '@/db/queries';
import { useDbQuery } from '@/state/app-state';

export default function PropertiesScreen() {
  const properties = useDbQuery((db, mode) => listProperties(db, mode));

  if (!properties) return <Loading />;

  return (
    <Screen>
      <Button title="+ Add property" onPress={() => router.push('/property-form')} />
      {properties.length === 0 ? (
        <EmptyState title="No properties yet" message="Add your first property to get started." />
      ) : (
        properties.map((p) => (
          <PressableCard
            key={p.id}
            onPress={() =>
              router.push({ pathname: '/properties/[id]', params: { id: String(p.id) } })
            }>
            <ThemedText type="smallBold" style={{ fontSize: 16 }}>
              {p.name}
            </ThemedText>
            {p.address ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {p.address}
              </ThemedText>
            ) : null}
          </PressableCard>
        ))
      )}
    </Screen>
  );
}
