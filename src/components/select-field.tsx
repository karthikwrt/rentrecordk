import { Picker } from '@expo/ui/community/picker';
import { StyleSheet, View } from 'react-native';

import { FieldLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string | number> = { label: string; value: T };

type Props<T extends string | number> = {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function SelectField<T extends string | number>({ label, value, options, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <View style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Picker<T> selectedValue={value} onValueChange={(v) => onChange(v)}>
          {options.map((o) => (
            <Picker.Item key={String(o.value)} label={o.label} value={o.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  box: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two + Spacing.one,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
