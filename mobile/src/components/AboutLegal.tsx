// Profile → "About & legal". Both stores require: an in-app privacy policy link,
// published support contact (Apple 1.5 / 1.2), and in-app account deletion
// (Apple 5.1.1(v), Google Play account deletion policy).
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight, FileText, Mail, ScrollText, Trash2, Users } from "lucide-react-native";
import { config } from "../config";
import { useAuth } from "../hooks/useAuth";
import { radius, useTheme } from "../theme/theme";
import { AppText } from "./ui/AppText";
import { useToast } from "./ui/Feedback";
import { COPYRIGHT } from "../lib/legalContent";

export const AboutLegal = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const { authState, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const navigation = useNavigation();
  const support = config.legal.supportEmail || "support@kushrewards.online";

  const Row = ({ label, onPress, icon: Icon = FileText, danger }: { label: string; onPress: () => void; icon?: typeof Mail; danger?: boolean }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && { backgroundColor: colors.muted }]}
    >
      <Icon size={18} color={danger ? colors.error : colors.mutedForeground} />
      <AppText style={{ flex: 1, color: danger ? colors.error : colors.foreground }}>{label}</AppText>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );

  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account, your reviews, venue suggestions and reports. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              toast.success("Your account has been deleted.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );

  return (
    <View style={{ gap: 12 }}>
      <AppText variant="h2">About & legal</AppText>
      <AppText variant="small" color="mutedForeground">
        KushRewards SA is an information guide to cannabis clubs and venues for adults 18+ in South Africa. We don't sell cannabis, take
        orders, handle payments or arrange deliveries, and we never share your details with venues. Cannabis is legal in South Africa
        for private use by adults only; trading in it is not. Never drive under the influence.
      </AppText>
      <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Row label="Privacy Policy" onPress={() => navigation.navigate("Legal", { doc: "privacy" })} />
        <Row label="Terms of Use" icon={ScrollText} onPress={() => navigation.navigate("Legal", { doc: "terms" })} />
        <Row label="Community Rules" icon={Users} onPress={() => navigation.navigate("Legal", { doc: "community-rules" })} />
        <Row label={`Contact support (${support})`} icon={Mail} onPress={() => Linking.openURL(`mailto:${support}?subject=KushRewards%20SA%20support`)} />
        <Row label="Help & FAQ" icon={Mail} onPress={() => navigation.navigate("Legal", { doc: "support" })} />
        {authState.type === "authenticated" ? (
          <Row label={deleting ? "Deleting…" : "Delete my account"} icon={Trash2} danger onPress={deleting ? () => undefined : confirmDelete} />
        ) : null}
      </View>
      <AppText variant="small" color="mutedForeground">{COPYRIGHT}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
