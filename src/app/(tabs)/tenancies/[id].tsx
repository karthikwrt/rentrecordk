import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DueList } from '@/components/due-list';
import { BalanceBadge } from '@/components/tenancy-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, InfoRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { deleteTenancy, getTenancy, listPayments, setTenancyActive } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, todayISO, toISODate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { FREQUENCY_LABEL, FREQUENCY_UNIT, rentStatus } from '@/lib/rent';
import { useAppState, useDbQuery, useModeLabels } from '@/state/app-state';

export default function TenancyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenancyId = Number(id);
  const db = useSQLiteContext();
  const theme = useTheme();
  const labels = useModeLabels();
  const { notifyDataChanged } = useAppState();

  const data = useDbQuery(
    async (db) => {
      const [tenancy, payments] = await Promise.all([
        getTenancy(db, tenancyId),
        listPayments(db, tenancyId),
      ]);
      return { tenancy, payments };
    },
    [tenancyId]
  );

  if (!data) return <Loading />;
  const { tenancy, payments } = data;
  if (!tenancy) {
    return (
      <Screen>
        <EmptyState title="Not found" message="This tenancy no longer exists." />
      </Screen>
    );
  }

  const status = rentStatus(tenancy);

  const toggleActive = () => {
    if (tenancy.active) {
      Alert.alert('End tenancy?', 'Rent will stop accruing from today.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End tenancy',
          style: 'destructive',
          onPress: async () => {
            const today = todayISO();
            const end = tenancy.end_date && tenancy.end_date < today ? tenancy.end_date : today;
            await setTenancyActive(db, tenancy.id, false, end);
            notifyDataChanged();
          },
        },
      ]);
    } else {
      setTenancyActive(db, tenancy.id, true, null).then(notifyDataChanged);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete tenancy?',
      `This also deletes its ${payments.length} payment record(s). This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTenancy(db, tenancy.id);
            notifyDataChanged();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: tenancy.property_name,
          headerRight: () => (
            <Pressable
              hitSlop={8}
              onPress={() =>
                router.push({ pathname: '/tenancy-form', params: { id: String(tenancy.id) } })
              }>
              <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 16 }}>
                Edit
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <Card>
        <View style={styles.balanceRow}>
          <ThemedText type="smallBold" style={{ fontSize: 16 }}>
            Balance
          </ThemedText>
          {tenancy.active ? null : <ThemedText type="small">Ended</ThemedText>}
          <BalanceBadge tenancy={tenancy} />
        </View>
        <InfoRow label={`Rent due so far (${status.periods} × ${formatINR(tenancy.rent_amount)})`} value={formatINR(status.expected)} />
        <InfoRow label={`Total ${labels.moneyVerb}`} value={formatINR(status.paid)} />
        {status.nextDue ? (
          <InfoRow label="Next due" value={formatDate(toISODate(status.nextDue))} />
        ) : null}
      </Card>

      <Button
        title={labels.recordPayment}
        onPress={() =>
          router.push({ pathname: '/payment-form', params: { tenancyId: String(tenancy.id) } })
        }
      />

      <Card>
        <InfoRow
          label="Property"
          value={
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/properties/[id]',
                  params: { id: String(tenancy.property_id) },
                })
              }>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {tenancy.property_name}
              </ThemedText>
            </Pressable>
          }
        />
        <InfoRow
          label={labels.person}
          value={
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/people/[id]',
                  params: { id: String(tenancy.person_id) },
                })
              }>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {tenancy.person_name}
              </ThemedText>
            </Pressable>
          }
        />
        <InfoRow label="Rent" value={`${formatINR(tenancy.rent_amount)} · ${FREQUENCY_LABEL[tenancy.frequency]}`} />
        <InfoRow label="Start date" value={formatDate(tenancy.start_date)} />
        <InfoRow label="End date" value={formatDate(tenancy.end_date)} />
        <InfoRow label="Deposit" value={formatINR(tenancy.deposit)} />
        {tenancy.notes ? <InfoRow label="Notes" value={tenancy.notes} /> : null}
      </Card>

      <SectionTitle>{`Dues (every ${FREQUENCY_UNIT[tenancy.frequency]})`}</SectionTitle>
      <DueList tenancy={tenancy} />

      <SectionTitle>{`Payments (${payments.length})`}</SectionTitle>
      {payments.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No payments recorded yet.
        </ThemedText>
      ) : (
        <Card>
          {payments.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: '/payment-form',
                  params: { tenancyId: String(tenancy.id), id: String(p.id) },
                })
              }
              style={({ pressed }) => [styles.paymentRow, pressed && { opacity: 0.6 }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">{formatDate(p.paid_on)}</ThemedText>
                {p.method || p.notes ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {[p.method, p.notes].filter(Boolean).join(' · ')}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="smallBold">{formatINR(p.amount)}</ThemedText>
            </Pressable>
          ))}
        </Card>
      )}

      <SectionTitle>Manage</SectionTitle>
      <Button
        title={tenancy.active ? 'End tenancy' : 'Reactivate tenancy'}
        variant="secondary"
        onPress={toggleActive}
      />
      <Button title="Delete tenancy" variant="danger" onPress={onDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
