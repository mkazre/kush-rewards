import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown } from "lucide-react-native";
import { fonts, radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

type Option = { value: string; label: string };

type Props = {
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  accessibilityLabel?: string;
};

/** Dropdown replacement: a field that opens a scrollable list in a bottom sheet (suburb, store picker). */
export const SelectSheet = ({ value, options, onChange, placeholder = "Choose…", label, accessibilityLabel }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <AppText numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodySemiBold, color: current ? colors.foreground : colors.mutedForeground }}>
          {current?.label ?? placeholder}
        </AppText>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
        <View style={styles.anchor} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: colors.popup, paddingBottom: insets.bottom + 8 }]}>
            {label ? <AppText variant="h3" style={{ paddingHorizontal: 20, paddingBottom: 8 }}>{label}</AppText> : null}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.value === value }}
                >
                  <AppText style={{ flex: 1 }}>{item.label}</AppText>
                  {item.value === value ? <Check size={18} color={colors.primary} /> : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { height: 44, borderWidth: 1, borderRadius: radius.base, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  anchor: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "70%", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 16 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
});
