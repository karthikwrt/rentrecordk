import { SegmentedControl } from '@expo/ui/community/segmented-control';

import { useAppState } from '@/state/app-state';

const MODES = ['owner', 'tenant'] as const;

/** Owner / Tenant switch shown in the header of every tab. */
export function ModeToggle() {
  const { mode, setMode } = useAppState();

  return (
    <SegmentedControl
      values={['Owner', 'Tenant']}
      selectedIndex={MODES.indexOf(mode)}
      onChange={(event) => setMode(MODES[event.nativeEvent.selectedSegmentIndex] ?? 'owner')}
      style={{ width: 160 }}
    />
  );
}
