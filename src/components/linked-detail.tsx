import { router, Stack, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { ReactNode } from 'react';
import { Alert, Pressable } from 'react-native';

import { TenancyCard } from '@/components/tenancy-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { countLinkedTenancies } from '@/db/queries';
import type { TenancyView } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useAppState } from '@/state/app-state';

type Props = {
  title: string;
  /** Rows describing the record. */
  info: ReactNode;
  editHref: Href;
  newTenancyHref: Href;
  tenancies: TenancyView[];
  /** Which tenancy column points at this record, for the delete guard. */
  linkColumn: 'property_id' | 'person_id';
  recordId: number;
  kind: string;
  onDelete: () => Promise<void>;
};

/** Shared layout for the property and person detail screens. */
export function LinkedDetail({
  title,
  info,
  editHref,
  newTenancyHref,
  tenancies,
  linkColumn,
  recordId,
  kind,
  onDelete,
}: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { notifyDataChanged } = useAppState();

  const confirmDelete = async () => {
    const linked = await countLinkedTenancies(db, linkColumn, recordId);
    if (linked > 0) {
      Alert.alert(
        `Can't delete ${kind}`,
        `This ${kind} is used by ${linked} tenancy record(s). Delete those tenancies first.`
      );
      return;
    }
    Alert.alert(`Delete ${kind}?`, "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await onDelete();
          notifyDataChanged();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable hitSlop={8} onPress={() => router.push(editHref)}>
              <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 16 }}>
                Edit
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <Card>{info}</Card>

      <SectionTitle>{`Tenancies (${tenancies.length})`}</SectionTitle>
      {tenancies.map((t) => (
        <TenancyCard key={t.id} tenancy={t} />
      ))}
      <Button title="+ New tenancy" variant="secondary" onPress={() => router.push(newTenancyHref)} />

      <SectionTitle>Manage</SectionTitle>
      <Button title={`Delete ${kind}`} variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
