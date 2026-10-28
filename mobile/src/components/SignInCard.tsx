// Shown wherever an action needs an account (add a store, report, review, profile).
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
import { radius, useTheme } from "../theme/theme";
import { useGoogleSignIn } from "../hooks/useGoogleSignIn";
import { useAppleSignIn } from "../hooks/useAppleSignIn";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { ErrorText } from "./ui/Feedback";

/**
 * Sign-in options. On iOS, Sign in with Apple is offered with equal prominence to
 * Google (App Review Guideline 4.8). Both appear above the email option.
 */
export const SignInButtons = ({ onSignedIn }: { onSignedIn?: () => void }) => {
  const { isDark } = useTheme();
  const google = useGoogleSignIn(onSignedIn);
  const apple = useAppleSignIn(onSignedIn);
  return (
    <View style={{ gap: 10 }}>
      {apple.available ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.base}
          style={{ height: 50, width: "100%" }}
          onPress={apple.start}
        />
      ) : null}
      {apple.error ? <ErrorText text={apple.error} /> : null}
      <Button title="Continue with Google" size="lg" onPress={google.start} disabled={!google.ready} loading={google.busy || apple.busy} />
      {google.error ? <ErrorText text={google.error} /> : null}
      <LegalSmallPrint />
    </View>
  );
};

/** "By continuing you agree to the Terms and Privacy Policy" with tappable links. */
export const LegalSmallPrint = () => {
  const navigation = useNavigation();
  return (
    <AppText variant="small" color="mutedForeground">
      By continuing you confirm you're 18 or older and agree to our{" "}
      <AppText variant="smallBold" color="primary" accessibilityRole="link" onPress={() => navigation.navigate("Legal", { doc: "terms" })}>Terms of Use</AppText> and{" "}
      <AppText variant="smallBold" color="primary" accessibilityRole="link" onPress={() => navigation.navigate("Legal", { doc: "privacy" })}>Privacy Policy</AppText>.
    </AppText>
  );
};

export function openUrl(url: string) {
  if (url) Linking.openURL(url).catch(() => undefined);
}

type Props = { title: string; text: string; onSignedIn?: () => void };

export const SignInCard = ({ title, text, onSignedIn }: Props) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppText variant="h2" style={{ fontSize: 21 }}>{title}</AppText>
      <AppText color="mutedForeground">{text}</AppText>
      <SignInButtons onSignedIn={onSignedIn} />
      <AppText variant="small" color="mutedForeground">
        Prefer email?{" "}
        <AppText variant="smallBold" color="primary" onPress={() => navigation.navigate("Login")} accessibilityRole="link">
          Sign in with email
        </AppText>
      </AppText>
    </View>
  );
};

/** Link-style text button used in footers ("Edit", "Report", "Remove logo"). */
export const LinkButton = ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button">
    <AppText variant="smallBold" color="mutedForeground" style={{ textDecorationLine: disabled ? "none" : "underline" }}>
      {title}
    </AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 24, paddingHorizontal: 16, gap: 12 },
});
