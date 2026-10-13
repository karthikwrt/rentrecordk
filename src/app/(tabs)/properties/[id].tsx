import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { LinkedDetail } from '@/components/linked-detail';
import { EmptyState, InfoRow, Loading, Screen } from '@/components/ui';
import { deleteProperty, getProperty, listTenanciesFor } from '@/db/queries';
import { useDbQuery } from '@/state/app-state';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = Number(id);
  const db = useSQLiteContext();

  const data = useDbQuery(
    async (db) => {
      const [property, tenancies] = await Promise.all([
        getProperty(db, propertyId),
        listTenanciesFor(db, 'property_id', propertyId),
      ]);
      return { property, tenancies };
    },
    [propertyId]
  );

  if (!data) return <Loading />;
  const { property, tenancies } = data;
  if (!property) {
    return (
      <Screen>
        <EmptyState title="Not found" message="This property no longer exists." />
      </Screen>
    );
  }

  return (
    <LinkedDetail
      title={property.name}
      kind="property"
      recordId={property.id}
      linkColumn="property_id"
      tenancies={tenancies}
      editHref={{ pathname: '/property-form', params: { id: String(property.id) } }}
      newTenancyHref={{ pathname: '/tenancy-form', params: { propertyId: String(property.id) } }}
      onDelete={() => deleteProperty(db, property.id)}
      info={
        <>
          <InfoRow label="Name" value={property.name} />
          <InfoRow label="Address" value={property.address || '—'} />
          {property.notes ? <InfoRow label="Notes" value={property.notes} /> : null}
        </>
      }
    />
  );
}
