// Full-screen age check on first launch. Uses a neutral date-of-birth entry
// (no pre-filled or "Yes" answer), which app reviewers expect for 18+ apps.
// Only the pass/fail result is kept on the device; the date is never stored or sent.
// A failed check is remembered, so the screen can't simply be retried.
import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { fonts, radius, useTheme } from "../theme/theme";
import { storage } from "../lib/storage";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { ErrorText } from "./ui/Feedback";

const AGE_KEY = "kr-age-ok"; // "1" passed, "0" under 18
const MIN_AGE = 18;

/** Age in whole years on `now`, or null if the date doesn't exist. */
export function ageOn(day: number, month: number, year: number, now = new Date()): number | null {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  if (d > now) return null;
  let age = now.getFullYear() - year;
  const hadBirthday = now.getMonth() > month - 1 || (now.getMonth() === month - 1 && now.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age;
}

export const AgeGate = () => {
  const { colors } = useTheme();
  const [state, setState] = useState<"checking" | "ask" | "ok" | "under">("checking");
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mmRef = useRef<TextInput>(null);
  const yyRef = useRef<TextInput>(null);

  useEffect(() => {
    storage.get(AGE_KEY).then((v) => setState(v === "1" ? "ok" : v === "0" ? "under" : "ask"));
  }, []);

  if (state === "ok" || state === "checking") return null;

  const submit = () => {
    setError(null);
    const year = Number(yyyy);
    if (yyyy.length !== 4 || year < 1900) return setError("Enter your full date of birth.");
    const age = ageOn(Number(dd), Number(mm), year);
    if (age === null) return setError("That date doesn't look right. Please check it.");
    if (age >= MIN_AGE) {
      storage.set(AGE_KEY, "1");
      setState("ok");
    } else {
      storage.set(AGE_KEY, "0");
      setState("under");
    }
  };

  const field = (value: string, set: (v: string) => void, placeholder: string, max: number, label: string, ref?: React.RefObject<TextInput | null>, next?: () => void) => (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={(v) => {
        const clean = v.replace(/\D/g, "").slice(0, max);
        set(clean);
        if (clean.length === max) next?.();
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType="number-pad"
      maxLength={max}
      accessibilityLabel={label}
      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, flex: max === 4 ? 1.6 : 1 }]}
    />
  );

  return (
    <Modal visible animationType="fade" onRequestClose={() => undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={[styles.mark, { backgroundColor: colors.primary }]}>
            <MapPin size={28} color={colors.primaryForeground} />
          </View>
          {state === "ask" ? (
            <>
              <AppText variant="h1" style={styles.center} accessibilityRole="header">Enter your date of birth</AppText>
              <AppText color="mutedForeground" style={styles.center}>
                KushRewards SA is a guide to cannabis clubs and venues in South Africa for adults aged 18 and over.
              </AppText>
              <View style={styles.row}>
                {field(dd, setDd, "DD", 2, "Day", undefined, () => mmRef.current?.focus())}
                {field(mm, setMm, "MM", 2, "Month", mmRef, () => yyRef.current?.focus())}
                {field(yyyy, setYyyy, "YYYY", 4, "Year", yyRef)}
              </View>
              {error ? <ErrorText text={error} /> : null}
              <View style={styles.actions}>
                <Button title="Continue" size="lg" onPress={submit} />
              </View>
              <AppText variant="small" color="mutedForeground" style={styles.center}>
                We don't store your date of birth. KushRewards doesn't sell cannabis or take orders.
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="h1" style={styles.center} accessibilityRole="header">Sorry, adults only</AppText>
              <AppText color="mutedForeground" style={styles.center}>You need to be 18 or older to use KushRewards SA.</AppText>
            </>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 380, gap: 16, alignItems: "center" },
  mark: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  row: { flexDirection: "row", gap: 8, width: "100%" },
  input: { height: 52, borderWidth: 1, borderRadius: radius.base, textAlign: "center", fontFamily: fonts.bodySemiBold, fontSize: 18 },
  actions: { width: "100%", gap: 8 },
});
