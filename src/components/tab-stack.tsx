import { Stack } from 'expo-router';

import { ModeToggle } from '@/components/mode-toggle';

/**
 * Stack used inside each tab. The tab's root screen shows the Owner/Tenant toggle;
 * detail screens (`[id]`) don't, so a detail never shows data from the other mode.
 */
export function TabStack({ title, hasDetail = true }: { title: string; hasDetail?: boolean }) {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title, headerRight: () => <ModeToggle /> }} />
      {hasDetail ? <Stack.Screen name="[id]" options={{ title: '' }} /> : null}
    </Stack>
  );
}
