import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

/** Bottom sheet modal. Replaces the web app's centred dialogs (review form, report, store editor). */
export const Sheet = ({ open, onClose, title, description, children }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.anchor} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.popup, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.head}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="h2" accessibilityRole="header">{title}</AppText>
              {description ? <AppText variant="small" color="mutedForeground">{description}</AppText> : null}
            </View>
            <Pressable onPress={onClose} style={[styles.close, { backgroundColor: colors.muted }]} accessibilityRole="button" accessibilityLabel="Close">
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  anchor: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: 20, paddingTop: 20 },
  head: { flexDirection: "row", gap: 12, marginBottom: 16, alignItems: "flex-start" },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
