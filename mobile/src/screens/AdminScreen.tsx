// Admin tab (role "admin" only): headline stats, then five sections:
// Queue (approve submitted stores), Stores (edit, see contact taps), Reports
// (wrong-info reports) and Reviews (hide/restore). Store-compliant build: no
// price or product-menu settings.
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Navigation, Pencil, Phone, Plus } from "lucide-react-native";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { queryKeys, useAdminOverview } from "../hooks/queries";
import { TYPE_LABELS } from "../lib/storeUtils";
import { fonts, radius, useTheme } from "../theme/theme";
import type { AdminStore } from "../types/api";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { EmptyBox, ErrorText, Skeleton, useToast } from "../components/ui/Feedback";
import { Segmented } from "../components/ui/Segmented";
import { Sheet } from "../components/ui/Sheet";
import { TextField } from "../components/ui/TextField";
import { Screen } from "../components/Screen";
import { StoreEditor } from "../components/StoreEditor";
import { StoreMonogram } from "../components/StoreCard";

type Tab = "queue" | "stores" | "reports" | "reviews";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });

export default function AdminScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const isAdmin = authState.type === "authenticated" && authState.user.role === "admin";
  const { data, isFetching, error, refetch } = useAdminOverview(isAdmin);
  const [editing, setEditing] = useState<AdminStore | null | "new">(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<Tab | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "hidden">("all");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview });
    queryClient.invalidateQueries({ queryKey: queryKeys.stores });
  };
  const decide = useMutation({
    mutationFn: api.adminDecideSubmission,
    onSuccess: (_r, v) => {
      refresh();
      toast.success(v.action === "approve" ? "Approved. Edit the venue to set its exact pin and hours." : v.action === "reject" ? "Rejected" : "Marked as needs info");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resolve = useMutation({
    mutationFn: api.adminResolveReport,
    onSuccess: () => {
      refresh();
      toast.success("Report closed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reviewStatus = useMutation({
    mutationFn: api.adminReviewStatus,
    onSuccess: (_r, v) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
      toast.success(v.status === "hidden" ? "Review hidden" : "Review is visible");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <Screen>
        <AppText variant="h1">Admin</AppText>
        <EmptyBox text="Only the app owner can open the admin panel." />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <ErrorText text={error.message} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <Skeleton height={80} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  const pending = data.submissions.filter((s) => s.status === "pending" || s.status === "needs_info");
  const decided = data.submissions.filter((s) => s.status === "approved" || s.status === "rejected").slice(0, 10);
  const openReports = data.reports.filter((r) => r.status === "open");
  const flaggedReviews = data.reviews.filter((r) => r.status === "visible" && r.reportCount > 0).length;
  const live = data.stores.filter((s) => s.status === "live").length;
  const wa30 = data.stores.reduce((a, s) => a + s.taps30.whatsapp, 0);
  const all30 = data.stores.reduce((a, s) => a + s.taps30.whatsapp + s.taps30.call + s.taps30.directions, 0);
  const currentTab: Tab = tab ?? (pending.length ? "queue" : "stores");
  const shownStores = filter === "all" ? data.stores : data.stores.filter((s) => s.status === filter);
  const editingStore = editing === "new" ? null : editing;

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
  );
  const Pill = ({ text }: { text: string }) => (
    <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
      <AppText style={{ fontSize: 12, fontFamily: fonts.bodyBold, color: colors.accentSoftForeground }}>{text}</AppText>
    </View>
  );
  const Stat = ({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) => (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityRole={onPress ? "button" : undefined}>
      <AppText tabular style={{ fontFamily: fonts.display, fontSize: 22 }}>{value}</AppText>
      <AppText style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</AppText>
    </Pressable>
  );

  return (
    <Screen onRefresh={refetch} refreshing={isFetching}>
      <View style={styles.headRow}>
        <AppText variant="h1" accessibilityRole="header">Admin</AppText>
        {isFetching ? <AppText variant="small" color="mutedForeground">Refreshing…</AppText> : null}
      </View>

      <View style={styles.stats}>
        <Stat value={live} label="Live venues" onPress={() => { setTab("stores"); setFilter("live"); }} />
        <Stat value={wa30} label="WhatsApp taps, 30 days" onPress={() => { setTab("stores"); setFilter("all"); }} />
        <Stat value={data.userCount} label="Signed-up users" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
        <Chip label={`Queue (${pending.length})`} selected={currentTab === "queue"} onPress={() => setTab("queue")} />
        <Chip label="Venues" selected={currentTab === "stores"} onPress={() => setTab("stores")} />
        <Chip label={`Reports (${openReports.length})`} selected={currentTab === "reports"} onPress={() => setTab("reports")} />
        <Chip label={`Reviews${flaggedReviews > 0 ? ` (${flaggedReviews})` : ""}`} selected={currentTab === "reviews"} onPress={() => setTab("reviews")} />
      </ScrollView>

      {currentTab === "queue" ? (
        <View style={styles.tab}>
          <AppText variant="small" color="mutedForeground">Call or visit a venue before approving it. Approved venues go live at the suburb centre; then edit them to set the exact pin and hours.</AppText>
          {pending.length === 0 ? <EmptyBox text="No venues waiting." /> : null}
          {pending.map((s) => (
            <Card key={s.id}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">{s.name}</AppText>
                  <AppText variant="small" color="mutedForeground">{TYPE_LABELS[s.type]} · {s.suburb} · by {s.submitterName} · {fmtDate(s.createdAt)}</AppText>
                </View>
                <Pill text={s.status === "needs_info" ? "Needs info" : "Pending"} />
              </View>
              <KV k="Address" v={s.address || "—"} />
              <KV k="WhatsApp" v={s.whatsapp || "—"} />
              <KV k="Hours" v={s.hoursNote || "—"} />
              {s.notes ? <KV k="Notes" v={s.notes} /> : null}
              <KV k="Contact" v={s.submitterEmail} />
              {s.isOwner ? (
                <View style={[styles.lead, { backgroundColor: colors.accentSoft }]}>
                  <AppText variant="smallBold" style={{ color: colors.accentSoftForeground }}>Submitted by the owner: a lead for a Verified listing.</AppText>
                </View>
              ) : null}
              <TextField placeholder="Reason or note (optional, shown to the submitter)" value={reasons[s.id] ?? ""} onChangeText={(v) => setReasons((p) => ({ ...p, [s.id]: v }))} />
              <View style={styles.btnRow}>
                <Button title="Approve" disabled={decide.isPending} onPress={() => decide.mutate({ id: s.id, action: "approve", reason: reasons[s.id]?.trim() || null })} />
                <Button title="Needs info" variant="outline" disabled={decide.isPending} onPress={() => decide.mutate({ id: s.id, action: "needs_info", reason: reasons[s.id]?.trim() || "We need more details about this venue" })} />
                <Button title="Reject" variant="ghost" disabled={decide.isPending} onPress={() => decide.mutate({ id: s.id, action: "reject", reason: reasons[s.id]?.trim() || "We couldn't verify this venue" })} />
              </View>
            </Card>
          ))}
          {decided.length > 0 ? (
            <>
              <AppText variant="h2">Recently decided</AppText>
              <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {decided.map((s, i) => (
                  <View key={s.id} style={[styles.listRow, { borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                    <AppText style={{ flex: 1 }}>{s.name}</AppText>
                    <AppText variant="small" color="mutedForeground">{s.status === "approved" ? "Approved" : "Rejected"} · {s.decidedAt ? fmtDate(s.decidedAt) : ""}</AppText>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {currentTab === "stores" ? (
        <View style={styles.tab}>
          <AppText variant="small" color="mutedForeground">Taps in the last 30 days. Show these to a venue when you pitch a Verified listing.</AppText>
          <Button title="Add venue" icon={Plus} onPress={() => setEditing("new")} />
          <Segmented
            accessibilityLabel="Show venues"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All (${data.stores.length})` },
              { value: "live", label: `Live (${live})` },
              { value: "hidden", label: `Hidden (${data.stores.length - live})` },
            ]}
          />
          {data.stores.length === 0 ? <EmptyBox text="No venues yet. Add your pilot venue." /> : shownStores.length === 0 ? <EmptyBox text="No venues here." /> : null}
          {shownStores.map((s) => (
            <Card key={s.id}>
              <View style={styles.cardHead}>
                <Pressable onPress={() => setEditing(s)} accessibilityLabel={`Edit ${s.name} logo`}>
                  <StoreMonogram store={s} size={44} />
                </Pressable>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="h3" onPress={() => setEditing(s)}>{s.name}</AppText>
                  <AppText variant="smallBold" color="primary" onPress={() => navigation.navigate("Store", { storeId: s.id })} accessibilityRole="link">View public page</AppText>
                  <AppText variant="small" color="mutedForeground">
                    {TYPE_LABELS[s.type]} · {s.suburb}{s.isPartner ? " · Partner" : ""}{s.status === "hidden" ? " · Hidden" : ""}
                  </AppText>
                </View>
                <Pressable onPress={() => setEditing(s)} style={[styles.iconBtn, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`Edit ${s.name}`}>
                  <Pencil size={18} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.taps}>
                <TapCount icon={MessageCircle} n={s.taps30.whatsapp} label="WhatsApp" />
                <TapCount icon={Phone} n={s.taps30.call} label="calls" />
                <TapCount icon={Navigation} n={s.taps30.directions} label="directions" />
              </View>
              <AppText variant="small" color="mutedForeground">All time: {s.tapsAll.whatsapp + s.tapsAll.call + s.tapsAll.directions} taps</AppText>
            </Card>
          ))}
          {all30 > 0 ? <AppText variant="small" color="mutedForeground">{all30} taps across all stores in the last 30 days.</AppText> : null}
        </View>
      ) : null}

      {currentTab === "reports" ? (
        <View style={styles.tab}>
          {openReports.length === 0 ? <EmptyBox text="No open reports." /> : null}
          {openReports.map((r) => (
            <Card key={r.id}>
              <AppText variant="h3">{r.storeName}</AppText>
              <AppText variant="small" color="mutedForeground">{r.field} · from {r.reporterName} · {fmtDate(r.createdAt)}</AppText>
              <AppText style={[styles.quote, { borderColor: colors.border }]}>{r.details}</AppText>
              <View style={styles.btnRow}>
                <Button
                  title="Edit venue"
                  variant="outline"
                  onPress={() => {
                    const st = data.stores.find((x) => x.id === r.storeId);
                    if (st) setEditing(st);
                  }}
                />
                <Button title="Fixed" onPress={() => resolve.mutate({ id: r.id, status: "confirmed" })} />
                <Button title="Dismiss" variant="ghost" onPress={() => resolve.mutate({ id: r.id, status: "dismissed" })} />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {currentTab === "reviews" ? (
        <View style={styles.tab}>
          <AppText variant="small" color="mutedForeground">Reported reviews show first. Hide fake or abusive reviews; they stop counting towards the venue's rating.</AppText>
          {data.reviews.length === 0 ? <EmptyBox text="No reviews yet." /> : null}
          {data.reviews.map((r) => (
            <Card key={r.id}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">{r.storeName}</AppText>
                  <AppText variant="small" color="mutedForeground">
                    {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)} · {r.authorName} ({r.authorEmail}) · {fmtDate(r.updatedAt)}
                  </AppText>
                </View>
                {r.status === "hidden" ? <Pill text="Hidden" /> : r.reportCount > 0 ? <Pill text={`Reported ${r.reportCount}×`} /> : null}
              </View>
              {r.tags.length > 0 ? <AppText variant="small" color="mutedForeground">{r.tags.join(" · ")}</AppText> : null}
              {r.comment ? <AppText style={[styles.quote, { borderColor: colors.border }]}>{r.comment}</AppText> : null}
              <View style={styles.btnRow}>
                {r.status === "visible" ? (
                  <Button title="Hide review" variant="outline" disabled={reviewStatus.isPending} onPress={() => reviewStatus.mutate({ id: r.id, status: "hidden" })} />
                ) : (
                  <Button title="Show again" variant="outline" disabled={reviewStatus.isPending} onPress={() => reviewStatus.mutate({ id: r.id, status: "visible" })} />
                )}
                {r.status === "visible" && r.reportCount > 0 ? (
                  <Button title="Keep, clear reports" variant="ghost" disabled={reviewStatus.isPending} onPress={() => reviewStatus.mutate({ id: r.id, status: "visible" })} />
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editingStore ? `Edit ${editingStore.name}` : "Add a venue"}>
        {editing !== null ? <StoreEditor key={editingStore ? editingStore.id : "new"} store={editingStore} onDone={() => setEditing(null)} /> : null}
      </Sheet>
    </Screen>
  );
}

const KV = ({ k, v }: { k: string; v: string }) => (
  <View style={styles.kv}>
    <AppText variant="small" color="mutedForeground" style={styles.k}>{k}</AppText>
    <AppText variant="small" style={{ flex: 1 }}>{v}</AppText>
  </View>
);

const TapCount = ({ icon: Icon, n, label }: { icon: typeof Phone; n: number; label: string }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icon size={15} color={colors.mutedForeground} />
      <AppText variant="smallBold" tabular>{n}</AppText>
      <AppText variant="small" color="mutedForeground">{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 2 },
  tab: { gap: 12 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  kv: { flexDirection: "row", gap: 12 },
  k: { width: 80 },
  lead: { padding: 12, borderRadius: radius.base },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  list: { borderWidth: 1, borderRadius: radius.md },
  listRow: { flexDirection: "row", gap: 8, paddingVertical: 10, paddingHorizontal: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.base, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  taps: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  quote: { borderLeftWidth: 3, paddingLeft: 10, fontSize: 14.5 },
});
