import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface InlinePopoverOption<T extends string> {
  value: T;
  label: string;
}

interface InlinePopoverSelectProps<T extends string> {
  label: string;
  value: T;
  valueLabel: string;
  valueColor: string;
  options: InlinePopoverOption<T>[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}

export function InlinePopoverSelect<T extends string>({
  label,
  value,
  valueLabel,
  valueColor,
  options,
  isOpen,
  onToggle,
  onSelect,
}: InlinePopoverSelectProps<T>) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <Pressable
        onTouchStart={(event) => event.stopPropagation()}
        onPress={onToggle}
        style={[styles.control, { borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}
      >
        <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.controlValueWrap}>
          <Text style={[styles.controlValue, { color: valueColor }]}>{valueLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={valueColor} />
        </View>
      </Pressable>

      {isOpen ? (
        <View style={[styles.menu, { borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary }]}> 
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                onTouchStart={(event) => event.stopPropagation()}
                onPress={() => onSelect(option.value)}
                style={[styles.menuItem, active && { backgroundColor: valueColor + '1A' }]}
              >
                <Text style={[styles.menuItemText, { color: active ? valueColor : colors.text }]}>{option.label}</Text>
                {active ? <Ionicons name="checkmark" size={14} color={valueColor} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  control: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  controlLabel: { fontSize: 10, fontFamily: 'Poppins_500Medium' },
  controlValueWrap: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  controlValue: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  menu: { marginTop: 4, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  menuItem: { minHeight: 36, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuItemText: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
});
