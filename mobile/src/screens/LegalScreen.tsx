// In-app Privacy Policy, Terms of Use, Community Rules and Support pages (v2 web: /privacy, /terms,
// /community-rules, /support). Readable without signing in. Content lives in lib/legalContent.ts.
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, type RouteProp, useRoute } from "@react-navigation/native";
import { ArrowLeft, Mail } from "lucide-react-native";
import { config } from "../config";
import { COPYRIGHT, LEGAL_DOCS, LEGAL_UPDATED, type LegalBlock } from "../lib/legalContent";
import { radius, useTheme } from "../theme/theme";
import type { RootStackParamList } from "../navigation/types";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";

const SUPPORT_FALLBACK = "support@kushrewards.online";

/** Renders **bold**, [[placeholder]] and {{support}} markup inside a paragraph. */
function Rich({ text, variant = "body" }: { text: string; variant?: "body" | "small" }) {
  const { colors } = useTheme();
  const support = config.legal.supportEmail || SUPPORT_FALLBACK;
  const parts = text.replace(/\{\{support\}\}/g, support).split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g).filter(Boolean);
  return (
    <AppText variant={variant}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <AppText key={i} variant={variant === "small" ? "smallBold" : "bodyBold"}>{p.slice(2, -2)}</AppText>
        ) : p.startsWith("[[") ? (
          <AppText key={i} variant={variant === "small" ? "smallBold" : "bodyBold"} style={{ backgroundColor: colors.accentSoft, color: colors.accentSoftForeground }}>
            [{p.slice(2, -2)}]
          </AppText>
        ) : p.includes(support) ? (
          p.split(support).flatMap((chunk, j, arr) =>
            j < arr.length - 1
              ? [chunk, <AppText key={`${i}-${j}`} variant={variant === "small" ? "smallBold" : "bodyBold"} color="primary" accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${support}`)}>{support}</AppText>]
              : [chunk]
          )
        ) : (
          p
        )
      )}
    </AppText>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const { colors } = useTheme();
  switch (block.type) {
    case "h2":
      return <AppText variant="h2" style={{ marginTop: 8 }} accessibilityRole="header">{block.text}</AppText>;
    case "h3":
      return <AppText variant="bodyBold" style={{ marginTop: 4 }}>{block.text}</AppText>;
    case "p":
      return <Rich text={block.text} />;
    case "bullets":
    case "numbered":
      return (
        <View style={{ gap: 6 }}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.li}>
              <AppText color="mutedForeground" style={styles.bullet}>{block.type === "numbered" ? `${i + 1}.` : "•"}</AppText>
              <View style={{ flex: 1 }}><Rich text={item} /></View>
            </View>
          ))}
        </View>
      );
    case "kv":
      return (
        <View style={[styles.kv, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {block.rows.map(([k, v]) => (
            <View key={k} style={[styles.kvRow, { borderColor: colors.border }]}>
              <AppText variant="small" color="mutedForeground" style={{ width: 120 }}>{k}</AppText>
              <View style={{ flex: 1 }}><Rich text={v} variant="small" /></View>
            </View>
          ))}
        </View>
      );
  }
}

export default function LegalScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "Legal">>();
  const doc = LEGAL_DOCS[params.doc];
  const support = config.legal.supportEmail || SUPPORT_FALLBACK;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.top}>
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Tabs", { screen: "Profile" }))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h1" accessibilityRole="header">{doc.title}</AppText>
        {doc.showUpdated ? <AppText variant="small" color="mutedForeground">Last updated {LEGAL_UPDATED}</AppText> : null}
        {doc.intro ? <Rich text={doc.intro} /> : null}
        {params.doc === "support" ? (
          <Button title={support} icon={Mail} size="lg" onPress={() => Linking.openURL(`mailto:${support}?subject=KushRewards%20SA%20support`)} />
        ) : null}
        {doc.blocks.map((b, i) => <Block key={i} block={b} />)}
        <AppText variant="small" color="mutedForeground" style={{ marginTop: 16 }}>{COPYRIGHT}</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 40, height: 40, borderRadius: radius.full, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  li: { flexDirection: "row", gap: 8 },
  bullet: { width: 16 },
  kv: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  kvRow: { flexDirection: "row", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
