import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { TenancyCard } from '@/components/tenancy-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { listRecentPayments, listTenancies, sumPaymentsBetween } from '@/db/queries';
import { useTheme } from '@/hooks/use-theme';
import { exportBackup, pickBackup, restoreBackup } from '@/lib/backup';
import { endOfMonthISO, formatDate, startOfMonthISO } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { rentStatus } from '@/lib/rent';
import { useAppState, useDbQuery, useModeLabels } from '@/state/app-state';

export default function DashboardScreen() {
  const labels = useModeLabels();
  const theme = useTheme();

  const data = useDbQuery(async (db, mode) => {
    const [tenancies, recent, thisMonth] = await Promise.all([
      listTenancies(db, mode),
      listRecentPayments(db, mode, 8),
      sumPaymentsBetween(db, mode, startOfMonthISO(), endOfMonthISO()),
    ]);
    return { tenancies, recent, thisMonth };
  });

  if (!data) return <Loading />;

  const active = data.tenancies.filter((t) => t.active);
  const outstanding = active.reduce((sum, t) => sum + Math.max(0, rentStatus(t).balance), 0);
  const overdueCount = active.filter((t) => rentStatus(t).balance > 0).length;

  return (
    <Screen>
      <View style={styles.stats}>
        <Card style={styles.stat}>
          <ThemedText type="small" themeColor="textSecondary">
            {labels.moneyIn} this month
          </ThemedText>
          <ThemedText style={[styles.statValue, { color: theme.success }]}>
            {formatINR(data.thisMonth)}
          </ThemedText>
        </Card>
        <Card style={styles.stat}>
          <ThemedText type="small" themeColor="textSecondary">
            Outstanding
          </ThemedText>
          <ThemedText
            style={[styles.statValue, { color: outstanding > 0 ? theme.danger : theme.text }]}>
            {formatINR(outstanding)}
          </ThemedText>
        </Card>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {active.length} active {active.length === 1 ? 'tenancy' : 'tenancies'}
        {overdueCount > 0 ? ` · ${overdueCount} with rent due` : ''}
      </ThemedText>

      <SectionTitle>Active tenancies</SectionTitle>
      {active.length === 0 ? (
        <EmptyState
          title="No active tenancies"
          message={`Add a property and ${labels.aPerson}, then link them in the Tenancy tab.`}
        />
      ) : (
        active.map((t) => <TenancyCard key={t.id} tenancy={t} />)
      )}

      <SectionTitle>Recent payments</SectionTitle>
      {data.recent.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No payments recorded yet.
        </ThemedText>
      ) : (
        <Card>
          {data.recent.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" numberOfLines={1}>
                  {p.property_name} · {p.person_name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDate(p.paid_on)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatINR(p.amount)}</ThemedText>
            </View>
          ))}
        </Card>
      )}

      <BackupSection />
    </Screen>
  );
}

function BackupSection() {
  const db = useSQLiteContext();
  const { notifyDataChanged } = useAppState();
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);

  const onBackup = async () => {
    setBusy('backup');
    try {
      await exportBackup(db);
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const { counts, backup } = picked;
      Alert.alert(
        'Restore backup?',
        `This replaces ALL current data (both Owner and Tenant) with the backup from ${formatDate(
          backup.exportedAt.slice(0, 10)
        )}:\n\n${counts.properties} properties, ${counts.people} people, ${counts.tenancies} tenancies, ${counts.payments} payments.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(db, backup);
                notifyDataChanged();
                Alert.alert('Restored', 'Your data has been restored.');
              } catch (e) {
                Alert.alert('Restore failed', e instanceof Error ? e.message : String(e));
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Restore failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SectionTitle>Backup</SectionTitle>
      <Card style={{ gap: Spacing.two }}>
        <ThemedText type="small" themeColor="textSecondary">
          Your data is stored only on this phone. Back it up regularly: tap Backup and choose
          Google Drive in the share menu. To restore, pick that file.
        </ThemedText>
        <Button title="Backup to Google Drive" onPress={onBackup} loading={busy === 'backup'} />
        <Button
          title="Restore from backup"
          variant="secondary"
          onPress={onRestore}
          loading={busy === 'restore'}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
