import { router } from 'expo-router';

import { TenancyCard } from '@/components/tenancy-card';
import { Button, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { listTenancies } from '@/db/queries';
import { useDbQuery, useModeLabels } from '@/state/app-state';

export default function TenanciesScreen() {
  const labels = useModeLabels();
  const tenancies = useDbQuery((db, mode) => listTenancies(db, mode));

  if (!tenancies) return <Loading />;

  const active = tenancies.filter((t) => t.active);
  const ended = tenancies.filter((t) => !t.active);

  return (
    <Screen>
      <Button title="+ Add tenancy" onPress={() => router.push('/tenancy-form')} />
      {tenancies.length === 0 ? (
        <EmptyState
          title="No tenancies yet"
          message={`A tenancy links a property with ${labels.aPerson} and sets the rent. All rent ${labels.moneyVerb} is recorded here.`}
        />
      ) : null}
      {active.length > 0 ? <SectionTitle>Active</SectionTitle> : null}
      {active.map((t) => (
        <TenancyCard key={t.id} tenancy={t} />
      ))}
      {ended.length > 0 ? <SectionTitle>Ended</SectionTitle> : null}
      {ended.map((t) => (
        <TenancyCard key={t.id} tenancy={t} />
      ))}
    </Screen>
  );
}
