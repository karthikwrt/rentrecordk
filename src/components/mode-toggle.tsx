import { SegmentedControl } from '@expo/ui/community/segmented-control';

import { useTheme } from '@/hooks/use-theme';
import { useAppState } from '@/state/app-state';

const MODES = ['owner', 'tenant'] as const;

/** Owner / Tenant switch shown in the header of every tab. */
export function ModeToggle() {
  const { mode, setMode } = useAppState();
  const theme = useTheme();

  return (
    <SegmentedControl
      values={['Owner', 'Tenant']}
      selectedIndex={MODES.indexOf(mode)}
      onChange={(event) => setMode(MODES[event.nativeEvent.selectedSegmentIndex] ?? 'owner')}
      tintColor={theme.tint}
      style={{ width: 160 }}
    />
  );
}
