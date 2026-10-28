// Admin form to add or edit a venue: logo, details, map pin, hours, features,
// partner flag and live/hidden status. Store-compliant build: no price level,
// product menu or prices (the backend leaves those columns unchanged on save).
import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Switch, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { api } from "../api/endpoints";
import { queryKeys } from "../hooks/queries";
import { config } from "../config";
import { DAYS, directionsLink, FEATURE_OPTIONS, parseLocation, storeInitials, SUBURBS, TYPE_LABELS } from "../lib/storeUtils";
import { fonts, radius, useTheme } from "../theme/theme";
import type { AdminStore, DayKey, StoreSaveInput, StoreType } from "../types/api";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Checkbox, useToast } from "./ui/Feedback";
import { Segmented } from "./ui/Segmented";
import { SelectSheet } from "./ui/SelectSheet";
import { TextField } from "./ui/TextField";
import { LinkButton } from "./SignInCard";

type Props = { store: AdminStore | null; onDone: () => void };

function initial(store: AdminStore | null): StoreSaveInput {
  if (!store) {
    const [lat, lng] = SUBURBS.Roodepoort;
    return {
      id: null, name: "", type: config.listedStoreTypes[0], suburb: "Roodepoort", address: "", latitude: lat, longitude: lng,
      whatsapp: "", phone: "", hours: {}, hoursNote: "", features: [],
      isPartner: false, status: "live", logoUrl: null,
    };
  }
  return {
    id: store.id, name: store.name, type: store.type, suburb: store.suburb, address: store.address,
    latitude: store.latitude, longitude: store.longitude, whatsapp: store.whatsapp ?? "", phone: store.phone ?? "",
    hours: store.hours ?? {}, hoursNote: store.hoursNote ?? "",
    features: store.features, isPartner: store.isPartner, status: store.status, logoUrl: store.logoUrl ?? null,
  };
}

const TIME = /^\d{2}:\d{2}$/;

export const StoreEditor = ({ store, onDone }: Props) => {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [f, setF] = useState<StoreSaveInput>(() => initial(store));
  const [locText, setLocText] = useState("");
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof StoreSaveInput>(k: K, v: StoreSaveInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const setDay = (k: DayKey, v: { open: string; close: string } | null) => setF((p) => ({ ...p, hours: { ...p.hours, [k]: v } }));
  const copyMonday = () => {
    const mon = f.hours.mon ?? null;
    setF((p) => ({ ...p, hours: Object.fromEntries(DAYS.map((d) => [d.key, mon])) }));
  };

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const url = await api.uploadLogo(res.assets[0]);
      set("logoUrl", url);
      toast.success("Logo uploaded. Save to apply it.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const applyLocation = () => {
    const loc = parseLocation(locText);
    if (!loc) {
      setLocMsg("Couldn't read that. Paste a Google Maps link, or coordinates like -26.1623, 27.8721.");
      return;
    }
    setF((p) => ({ ...p, latitude: loc.lat, longitude: loc.lng }));
    setLocMsg(`Pin set to ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}.`);
  };

  const save = useMutation({
    mutationFn: api.adminSaveStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview });
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      toast.success(store ? "Venue updated" : "Venue added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (f.name.trim().length < 2) return toast.error("Venue name is too short");
    const badTime = Object.values(f.hours).some((h) => h && (!TIME.test(h.open) || !TIME.test(h.close)));
    if (badTime) return toast.error("Use HH:MM times, e.g. 09:00");
    save.mutate({ ...f, name: f.name.trim(), whatsapp: f.whatsapp?.trim() || null, phone: f.phone?.trim() || null, hoursNote: f.hoursNote?.trim() || null });
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.field}>
        <AppText variant="label">Logo</AppText>
        <View style={styles.logoRow}>
          <Pressable onPress={pickLogo} disabled={uploading} style={[styles.logoBox, { backgroundColor: f.logoUrl ? colors.logoBackground : colors.secondary }]} accessibilityLabel={f.logoUrl ? "Change logo" : "Upload logo"}>
            {f.logoUrl ? (
              <Image source={{ uri: f.logoUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            ) : (
              <AppText style={{ fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.secondaryForeground }}>{storeInitials(f.name || "?")}</AppText>
            )}
            <View style={styles.logoOverlay}>{uploading ? <AppText style={{ color: "#fff", fontSize: 11 }}>Uploading…</AppText> : <Camera size={18} color="#fff" />}</View>
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <Button title={f.logoUrl ? "Change logo" : "Upload logo"} size="sm" variant="outline" onPress={pickLogo} disabled={uploading} />
            {f.logoUrl ? <LinkButton title="Remove logo" onPress={() => set("logoUrl", null)} /> : null}
            <AppText variant="small" color="mutedForeground">Square images look best. PNG, JPG, WEBP or SVG, up to 5 MB.</AppText>
          </View>
        </View>
      </View>

      <TextField label="Name" value={f.name} onChangeText={(v) => set("name", v)} maxLength={80} />

      <View style={styles.field}>
        <AppText variant="label">Type</AppText>
        <Segmented<StoreType> value={f.type} onChange={(v) => set("type", v)} options={config.listedStoreTypes.map((k: StoreType) => ({ value: k, label: TYPE_LABELS[k] }))} />
      </View>

      <SelectSheet label="Suburb" value={f.suburb} onChange={(v) => set("suburb", v)} options={Object.keys(SUBURBS).map((s) => ({ value: s, label: s }))} />

      <View style={styles.inline}>
        <Switch value={f.status === "live"} onValueChange={(c) => set("status", c ? "live" : "hidden")} trackColor={{ true: colors.primary, false: colors.muted }} />
        <AppText>{f.status === "live" ? "Live (shown in the app)" : "Hidden"}</AppText>
      </View>

      <TextField label="Street address" value={f.address} onChangeText={(v) => set("address", v)} maxLength={200} />

      <View style={styles.field}>
        <AppText variant="label">Map pin</AppText>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField value={locText} onChangeText={setLocText} placeholder="Paste a Google Maps link or -26.16, 27.87" autoCapitalize="none" />
          </View>
          <Button title="Set" variant="outline" onPress={applyLocation} />
        </View>
        <AppText variant="small" color="mutedForeground">Now: {f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}</AppText>
        <View style={styles.row}>
          <LinkButton
            title="Use suburb centre"
            onPress={() => {
              const c = SUBURBS[f.suburb];
              if (c) setF((p) => ({ ...p, latitude: c[0], longitude: c[1] }));
              setLocMsg(`Pin set to the centre of ${f.suburb}.`);
            }}
          />
          <LinkButton title="Check on Google Maps" onPress={() => Linking.openURL(directionsLink(f.latitude, f.longitude))} />
        </View>
        {locMsg ? <AppText variant="small" color="mutedForeground">{locMsg}</AppText> : null}
      </View>

      <TextField label="WhatsApp" keyboardType="phone-pad" value={f.whatsapp ?? ""} onChangeText={(v) => set("whatsapp", v)} placeholder="+27 67 000 0000" />
      <TextField label="Phone (if different)" keyboardType="phone-pad" value={f.phone ?? ""} onChangeText={(v) => set("phone", v)} />

      <View style={styles.field}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <AppText variant="label">Opening hours</AppText>
          <LinkButton title="Copy Monday to every day" onPress={copyMonday} />
        </View>
        <View style={[styles.hours, { borderColor: colors.border }]}>
          {DAYS.map((d) => {
            const h = f.hours[d.key] ?? null;
            return (
              <View key={d.key} style={[styles.hourRow, { borderColor: colors.border }]}>
                <AppText variant="bodyBold" style={{ width: 40 }}>{d.label}</AppText>
                <Checkbox checked={!!h} onChange={(c) => setDay(d.key, c ? { open: "10:00", close: "20:00" } : null)} label="Open" />
                {h ? (
                  <View style={[styles.row, { flex: 1 }]}>
                    <View style={{ flex: 1 }}>
                      <TextField value={h.open} onChangeText={(v) => setDay(d.key, { ...h, open: v })} placeholder="10:00" maxLength={5} keyboardType="numbers-and-punctuation" accessibilityLabel={`${d.label} opens`} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextField value={h.close} onChangeText={(v) => setDay(d.key, { ...h, close: v })} placeholder="20:00" maxLength={5} keyboardType="numbers-and-punctuation" accessibilityLabel={`${d.label} closes`} />
                    </View>
                  </View>
                ) : (
                  <AppText variant="small" color="mutedForeground">Closed</AppText>
                )}
              </View>
            );
          })}
        </View>
        <TextField value={f.hoursNote ?? ""} onChangeText={(v) => set("hoursNote", v)} placeholder="Note, e.g. Closed on public holidays" maxLength={200} />
      </View>

      <View style={styles.field}>
        <AppText variant="label">Features</AppText>
        <View style={styles.wrapRow}>
          {FEATURE_OPTIONS.map((x) => (
            <Chip key={x} label={x} tone="pick" selected={f.features.includes(x)} onPress={() => set("features", f.features.includes(x) ? f.features.filter((y) => y !== x) : [...f.features, x])} />
          ))}
        </View>
      </View>

      <View style={styles.inline}>
        <Switch value={f.isPartner} onValueChange={(c) => set("isPartner", c)} trackColor={{ true: colors.primary, false: colors.muted }} />
        <AppText style={{ flex: 1 }}>Partner venue (shows a Partner badge and a green pin)</AppText>
      </View>

      <View style={[styles.row, { justifyContent: "flex-end" }]}>
        <Button title="Cancel" variant="ghost" onPress={onDone} />
        <Button title={store ? "Save changes" : "Add venue"} onPress={submit} loading={save.isPending} disabled={uploading} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  inline: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  logoBox: { width: 72, height: 72, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  logoOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 24, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  hours: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  hourRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
