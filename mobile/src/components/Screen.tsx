// Layout for every tab screen: safe area, the brand header, and a scrolling
// column with pull-to-refresh.
import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/theme";
import { BrandHeader } from "./BrandHeader";

type Props = {
  children: ReactNode;
  /** Pull-to-refresh handler; omit to disable. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Hide the brand header (e.g. on the store page, which has its own hero). */
  hideHeader?: boolean;
  gap?: number;
};

export const Screen = ({ children, onRefresh, refreshing = false, hideHeader, gap = 16 }: Props) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: colors.background }]}>
      {!hideHeader ? (
        <View style={styles.header}>
          <BrandHeader onPress={() => navigation.navigate("Tabs", { screen: "Discover" })} />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.content, { gap }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
});
