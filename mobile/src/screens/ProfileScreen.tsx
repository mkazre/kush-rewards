// Profile tab: who you are, your venue suggestions and their status, theme
// setting, sign out, and the 18+ / no-sales notice.
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LogOut, ShieldCheck } from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { useMySubmissions } from "../hooks/queries";
import { fonts, radius, useTheme, type ThemeMode } from "../theme/theme";
import type { SubmissionStatus } from "../types/api";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { ErrorText, Skeleton } from "../components/ui/Feedback";
import { Segmented } from "../components/ui/Segmented";
import { Screen } from "../components/Screen";
import { SignInCard } from "../components/SignInCard";
import { AboutLegal } from "../components/AboutLegal";

const STATUS_LABEL: Record<SubmissionStatus, string> = { pending: "Pending", needs_info: "Needs info", approved: "Approved", rejected: "Not approved" };

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const navigation = useNavigation();
  const { authState, logout } = useAuth();
  const signedIn = authState.type === "authenticated";
  const subs = useMySubmissions(signedIn);

  const statusColors: Record<SubmissionStatus, { bg: string; fg: string }> = {
    pending: { bg: colors.accentSoft, fg: colors.accentSoftForeground },
    needs_info: { bg: colors.accentSoft, fg: colors.accentSoftForeground },
    approved: { bg: colors.secondary, fg: colors.secondaryForeground },
    rejected: { bg: colors.muted, fg: colors.mutedForeground },
  };

  const themeSetting = (
    <View style={styles.section}>
      <AppText variant="h2">Settings</AppText>
      <View style={{ gap: 6 }}>
        <AppText variant="label">Theme</AppText>
        <Segmented<ThemeMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "auto", label: "Auto" },
          ]}
        />
      </View>
      {signedIn ? <Button title="Sign out" icon={LogOut} variant="outline" onPress={logout} /> : null}
    </View>
  );

  return (
    <Screen onRefresh={signedIn ? subs.refetch : undefined} refreshing={subs.isFetching && !!subs.data}>
      {authState.type === "loading" ? (
        <Skeleton height={160} />
      ) : authState.type !== "authenticated" ? (
        <SignInCard title="Your KushRewards profile" text="Sign in to write reviews, suggest venues and report wrong info. Browsing venues needs no account." />
      ) : (
        <>
          <View style={styles.head}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              {authState.user.avatarUrl ? (
                <Image source={{ uri: authState.user.avatarUrl }} style={StyleSheet.absoluteFill} />
              ) : (
                <AppText style={{ fontFamily: fonts.displayExtraBold, fontSize: 21, color: colors.secondaryForeground }}>
                  {authState.user.displayName.slice(0, 1).toUpperCase()}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="h1" style={{ fontSize: 22 }}>{authState.user.displayName}</AppText>
              <AppText variant="small" color="mutedForeground">{authState.user.email}</AppText>
            </View>
          </View>

          {authState.user.role === "admin" ? (
            <Button title="Open the admin panel" icon={ShieldCheck} variant="secondary" size="lg" onPress={() => navigation.navigate("Tabs", { screen: "Admin" })} />
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="h2" style={{ flex: 1 }}>My venue suggestions</AppText>
              <Button title="Suggest" size="sm" variant="outline" onPress={() => navigation.navigate("Tabs", { screen: "AddStore" })} />
            </View>
            {subs.isFetching && !subs.data ? (
              <Skeleton height={64} />
            ) : subs.error ? (
              <ErrorText text={subs.error.message} />
            ) : subs.data && subs.data.submissions.length > 0 ? (
              <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {subs.data.submissions.map((s, i) => {
                  const c = statusColors[s.status];
                  const pill = (
                    <View style={[styles.status, { backgroundColor: c.bg }]}>
                      <AppText style={{ fontSize: 12, fontFamily: fonts.bodyBold, color: c.fg }}>{STATUS_LABEL[s.status]}</AppText>
                    </View>
                  );
                  return (
                    <View key={s.id} style={[styles.item, { borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="bodyBold">{s.name}</AppText>
                        <AppText variant="small" color="mutedForeground">
                          {s.suburb} · {new Date(s.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                          {s.decisionReason ? ` · ${s.decisionReason}` : ""}
                        </AppText>
                      </View>
                      {s.status === "approved" && s.storeId ? (
                        <Pressable onPress={() => navigation.navigate("Store", { storeId: s.storeId! })} accessibilityRole="link">{pill}</Pressable>
                      ) : (
                        pill
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <AppText variant="small" color="mutedForeground">Venues you suggest show here while we check them.</AppText>
            )}
          </View>
        </>
      )}

      {themeSetting}

      <AboutLegal />

      <AppText style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 16 }}>
        18+ only. Information guide only: no sales, orders, payments or deliveries.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  list: { borderWidth: 1, borderRadius: radius.md },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  status: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
});
