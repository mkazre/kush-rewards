// Home tab: choose your area (suburb or GPS), search, filter, see a schematic
// map and the venue list sorted by distance.
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LocateFixed, Plus, Search } from "lucide-react-native";
import { useStores } from "../hooks/queries";
import { config } from "../config";
import { useUserLocation } from "../hooks/useUserLocation";
import { distanceKm, openState, SUBURBS, TYPE_LABELS } from "../lib/storeUtils";
import { radius, useTheme } from "../theme/theme";
import type { StoreType } from "../types/api";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { EmptyBox, ErrorText, Skeleton } from "../components/ui/Feedback";
import { SelectSheet } from "../components/ui/SelectSheet";
import { TextField } from "../components/ui/TextField";
import { AreaMap } from "../components/AreaMap";
import { StoreCard } from "../components/StoreCard";
import { Screen } from "../components/Screen";

type Filters = { q: string; open: boolean; partner: boolean; types: StoreType[] };
const NO_FILTERS: Filters = { q: "", open: false, partner: false, types: [] };

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { data, isFetching, error, refetch } = useStores();
  const { location, setSuburb, useMyLocation, locating, error: locError } = useUserLocation();
  const [f, setF] = useState<Filters>(NO_FILTERS);

  const list = useMemo(() => {
    const stores = data?.stores ?? [];
    return stores
      .filter((s) => !f.q || `${s.name} ${s.suburb}`.toLowerCase().includes(f.q.toLowerCase()))
      .filter((s) => !f.open || openState(s.hours).isOpen === true)
      .filter((s) => !f.partner || s.isPartner)
      .filter((s) => f.types.length === 0 || f.types.includes(s.type))
      .map((s) => ({ s, d: distanceKm(location, { lat: s.latitude, lng: s.longitude }) }))
      .sort((a, b) => a.d - b.d);
  }, [data, f, location]);

  const toggleType = (t: StoreType) => setF((p) => ({ ...p, types: p.types.includes(t) ? p.types.filter((x) => x !== t) : [...p.types, t] }));
  const anyFilter = !!f.q || f.open || f.partner || f.types.length > 0;
  const openStore = (storeId: number) => navigation.navigate("Store", { storeId });

  const areaOptions = [
    ...(location.source === "gps" ? [{ value: "__gps", label: "Your location" }] : []),
    ...Object.keys(SUBURBS).map((s) => ({ value: s, label: s })),
  ];

  return (
    <Screen onRefresh={refetch} refreshing={isFetching && !!data} gap={12}>
      {/* Location bar */}
      <View style={styles.locBar}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="eyebrow" color="mutedForeground">Showing venues near</AppText>
          <SelectSheet
            label="Your area"
            value={location.source === "suburb" ? location.label : "__gps"}
            onChange={(v) => v !== "__gps" && setSuburb(v)}
            options={areaOptions}
          />
        </View>
        <Button title={locating ? "Finding…" : "Near me"} icon={LocateFixed} variant="outline" onPress={useMyLocation} disabled={locating} accessibilityLabel="Use my location" />
      </View>
      {locError ? <ErrorText text={locError} /> : null}

      <TextField leftIcon={Search} placeholder="Search by name or suburb" value={f.q} onChangeText={(q) => setF((p) => ({ ...p, q }))} accessibilityLabel="Search venues" returnKeyType="search" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -16 }}>
        <Chip label="Open now" selected={f.open} onPress={() => setF((p) => ({ ...p, open: !p.open }))} />
        <Chip label="Partners" selected={f.partner} onPress={() => setF((p) => ({ ...p, partner: !p.partner }))} />
        {config.listedStoreTypes.length > 1 && config.listedStoreTypes.map((k) => (
          <Chip key={k} label={TYPE_LABELS[k]} selected={f.types.includes(k)} onPress={() => toggleType(k)} />
        ))}
      </ScrollView>

      {error ? (
        <ErrorText text={`We couldn't load venues: ${error.message}`} />
      ) : !data && isFetching ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={190} />
          <Skeleton height={110} />
          <Skeleton height={110} />
        </View>
      ) : (
        <>
          {list.length > 0 ? (
            <AreaMap pins={list.map(({ s }) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude, partner: s.isPartner }))} me={location} onPinPress={openStore} />
          ) : null}
          <View style={styles.listHead}>
            <AppText variant="h2" style={{ flex: 1, fontSize: 19 }}>
              {list.length} {list.length === 1 ? "venue" : "venues"} near {location.label}
            </AppText>
            {anyFilter ? <Button title="Clear" size="sm" variant="ghost" onPress={() => setF(NO_FILTERS)} /> : null}
          </View>
          <View style={{ gap: 12 }}>
            {list.map(({ s, d }) => (
              <StoreCard key={s.id} store={s} distanceKm={d} onPress={() => openStore(s.id)} />
            ))}
            {list.length === 0 ? <EmptyBox text={anyFilter ? "No venues match these filters." : "No venues are listed yet."} /> : null}
          </View>
        </>
      )}

      {/* "Know a venue that's missing?" card */}
      <View style={[styles.addCard, { borderColor: colors.border }]}>
        <View style={[styles.addIcon, { backgroundColor: colors.accentSoft }]}>
          <Plus size={20} color={colors.accentSoftForeground} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodyBold">Know a venue that's missing?</AppText>
          <AppText variant="small" color="mutedForeground">Suggest it and we'll check it and put it on the map.</AppText>
          <View style={{ alignSelf: "flex-start", marginTop: 8 }}>
            <Button title="Suggest a venue" variant="outline" onPress={() => navigation.navigate("Tabs", { screen: "AddStore" })} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  locBar: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 2 },
  listHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  addCard: { flexDirection: "row", gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", marginTop: 8 },
  addIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
