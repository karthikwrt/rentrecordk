import { TabStack } from '@/components/tab-stack';
import { useModeLabels } from '@/state/app-state';

export default function Layout() {
  const labels = useModeLabels();
  return <TabStack title={labels.people} />;
}
