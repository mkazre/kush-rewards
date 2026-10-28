// Small feedback pieces: skeleton placeholders, empty/error boxes, checkbox and toasts.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { fonts, radius, useTheme } from "../../theme/theme";
import { AppText } from "./AppText";

/** Grey pulsing block shown while data loads. */
export const Skeleton = ({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, borderRadius: radius.lg, backgroundColor: colors.muted, opacity: pulse }, style]} />;
};

export const EmptyBox = ({ text, dashed }: { text: string; dashed?: boolean }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.empty,
        dashed
          ? { borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.card }
          : { backgroundColor: colors.surface },
      ]}
    >
      <AppText variant="small" color="mutedForeground" style={{ textAlign: dashed ? "center" : "left" }}>{text}</AppText>
    </View>
  );
};

export const ErrorText = ({ text }: { text: string }) => (
  <AppText variant="smallBold" color="error" accessibilityRole="alert">{text}</AppText>
);

export const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.card }]}>
        {checked ? <Check size={14} color={colors.primaryForeground} /> : null}
      </View>
      <AppText>{label}</AppText>
    </Pressable>
  );
};

// ---------- Toasts ----------
type Toast = { id: number; text: string; kind: "success" | "error" };
type ToastCtx = { success: (t: string) => void; error: (t: string) => void };
const ToastContext = createContext<ToastCtx | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const value = { success: (t: string) => push(t, "success"), error: (t: string) => push(t, "error") };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[styles.toastWrap, { top: insets.top + 8 }]}>
        {toasts.map((t) => (
          <View
            key={t.id}
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: colors.popup, borderColor: t.kind === "error" ? colors.error : colors.border }]}
          >
            <AppText style={{ fontFamily: fonts.bodySemiBold, color: t.kind === "error" ? colors.error : colors.foreground }}>{t.text}</AppText>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  empty: { padding: 16, borderRadius: radius.md },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  toastWrap: { position: "absolute", left: 16, right: 16, gap: 8, alignItems: "center" },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
