import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { TenancyView } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, toISODate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { dueSchedule, type DueItem } from '@/lib/rent';

const PAGE = 30;

function periodLabel(item: DueItem, tenancy: TenancyView) {
  const from = formatDate(toISODate(item.from));
  if (tenancy.frequency === 'daily') return from;
  return `${from} – ${formatDate(toISODate(item.to))}`;
}

/** Every rent period that has become due, newest first, with paid / unpaid status. */
export function DueList({ tenancy }: { tenancy: TenancyView }) {
  const theme = useTheme();
  const [limit, setLimit] = useState(PAGE);
  const items = dueSchedule(tenancy);

  if (items.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No rent due yet. The first rent is due on {formatDate(tenancy.start_date)}.
      </ThemedText>
    );
  }

  const unpaidCount = items.filter((i) => i.status !== 'paid').length;

  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
        {unpaidCount === 0
          ? `All ${items.length} paid`
          : `${unpaidCount} of ${items.length} not fully paid`}
      </ThemedText>
      {items.slice(0, limit).map((item) => (
        <View key={item.index} style={[styles.row, { borderTopColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="small">{periodLabel(item, tenancy)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatINR(item.amount)}
            </ThemedText>
          </View>
          {item.status === 'paid' ? (
            <Badge tone="success" label="Paid" />
          ) : item.status === 'partial' ? (
            <Badge tone="danger" label={`${formatINR(item.amount - item.paid)} left`} />
          ) : (
            <Badge tone="danger" label="Unpaid" />
          )}
        </View>
      ))}
      {items.length > limit ? (
        <Pressable onPress={() => setLimit((l) => l + PAGE)} hitSlop={8} style={styles.more}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            Show more ({items.length - limit} older)
          </ThemedText>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  more: {
    paddingTop: Spacing.two,
    alignItems: 'center',
  },
});
