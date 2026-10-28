// Shown before someone first posts anything (review, venue suggestion, report).
// Google Play's User Generated Content policy requires users to accept terms that
// prohibit objectionable content before they can post; Apple 1.2 expects the same.
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { radius, useTheme } from "../theme/theme";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { ErrorText } from "./ui/Feedback";
import { useNavigation } from "@react-navigation/native";

export const COMMUNITY_RULES = [
  "Be honest: only review venues you've actually visited.",
  "No offering, buying or selling of cannabis or anything else, and no prices or menus.",
  "No harassment, hate speech, threats or personal information about others.",
  "No sexual content, spam or advertising.",
  "Nothing involving anyone under 18.",
];

/** Renders children only once the signed-in user has accepted the Terms and Community Rules. */
export const RequireTerms = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  const { authState, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);

  if (authState.type !== "authenticated" || authState.user.termsAcceptedAt) return <>{children}</>;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const { termsAcceptedAt } = await api.acceptTerms();
      updateUser({ ...authState.user, termsAcceptedAt });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppText variant="h2">Community rules</AppText>
      <AppText color="mutedForeground">Before you post, please agree to keep KushRewards useful and safe:</AppText>
      <View style={{ gap: 6 }}>
        {COMMUNITY_RULES.map((r) => (
          <AppText key={r}>•  {r}</AppText>
        ))}
      </View>
      <AppText variant="small" color="mutedForeground">
        Posts that break these rules are removed and repeat offenders are banned. Read the full{" "}
        <AppText variant="smallBold" color="primary" accessibilityRole="link" onPress={() => navigation.navigate("Legal", { doc: "terms" })}>Terms of Use</AppText> and{" "}
        <AppText variant="smallBold" color="primary" accessibilityRole="link" onPress={() => navigation.navigate("Legal", { doc: "community-rules" })}>Community Rules</AppText>.
      </AppText>
      {error ? <ErrorText text={error} /> : null}
      <Button title="I agree" size="lg" onPress={accept} loading={busy} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 12 },
});
