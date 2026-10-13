import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, PressableCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { TenancyView } from '@/db/types';
import { formatDate, toISODate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { FREQUENCY_UNIT, rentStatus } from '@/lib/rent';

export function BalanceBadge({ tenancy }: { tenancy: TenancyView }) {
  const status = rentStatus(tenancy);
  if (status.balance > 0) return <Badge tone="danger" label={`${formatINR(status.balance)} due`} />;
  if (status.balance < 0)
    return <Badge tone="success" label={`${formatINR(-status.balance)} advance`} />;
  return <Badge tone="success" label="Up to date" />;
}

export function TenancyCard({ tenancy }: { tenancy: TenancyView }) {
  const status = rentStatus(tenancy);
  return (
    <PressableCard
      onPress={() =>
        router.push({ pathname: '/tenancies/[id]', params: { id: String(tenancy.id) } })
      }>
      <View style={styles.top}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {tenancy.property_name}
        </ThemedText>
        {tenancy.active ? <BalanceBadge tenancy={tenancy} /> : <Badge tone="neutral" label="Ended" />}
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {tenancy.person_name} · {formatINR(tenancy.rent_amount)} / {FREQUENCY_UNIT[tenancy.frequency]}
      </ThemedText>
      {status.nextDue ? (
        <ThemedText type="small" themeColor="textSecondary">
          Next due {formatDate(toISODate(status.nextDue))}
        </ThemedText>
      ) : null}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    fontSize: 16,
    flexShrink: 1,
  },
});
