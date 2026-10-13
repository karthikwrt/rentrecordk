import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FieldLabel } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, fromISODate, toISODate } from '@/lib/dates';

type Props = {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  placeholder?: string;
  minimumDate?: string;
  /** Shows a "Clear" link (for optional dates). */
  onClear?: () => void;
};

/** Date input: inline compact picker on iOS/web, tap-to-open dialog on Android. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  onClear,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const date = value ? fromISODate(value) : new Date();
  const minDate = minimumDate ? fromISODate(minimumDate) : undefined;

  const header = (
    <View style={styles.row}>
      <FieldLabel>{label}</FieldLabel>
      {onClear && value ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            Clear
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  if (Platform.OS === 'android' || value === null) {
    return (
      <View style={styles.field}>
        {header}
        <Pressable
          onPress={() => setOpen(true)}
          style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText themeColor={value ? 'text' : 'textSecondary'}>
            {value ? formatDate(value) : placeholder}
          </ThemedText>
        </Pressable>
        {open && Platform.OS === 'android' ? (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={minDate}
            onValueChange={(_, picked) => {
              setOpen(false);
              onChange(toISODate(picked));
            }}
            onDismiss={() => setOpen(false)}
          />
        ) : null}
        {open && Platform.OS !== 'android' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            minimumDate={minDate}
            accentColor={theme.tint}
            onValueChange={(_, picked) => {
              setOpen(false);
              onChange(toISODate(picked));
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      {header}
      <DateTimePicker
        value={date}
        mode="date"
        display="compact"
        minimumDate={minDate}
        accentColor={theme.tint}
        onValueChange={(_, picked) => onChange(toISODate(picked))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
});
