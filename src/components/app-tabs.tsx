import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useModeLabels } from '@/state/app-state';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const labels = useModeLabels();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tenancies">
        <NativeTabs.Trigger.Label>Tenancy</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text" md="receipt_long" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="properties">
        <NativeTabs.Trigger.Label>Properties</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.2" md="apartment" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="people">
        <NativeTabs.Trigger.Label>{labels.people}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2" md="group" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
