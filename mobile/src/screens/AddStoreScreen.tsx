// "Suggest a venue" tab: signed-in users suggest a missing venue. It goes to the
// admin Queue for checking (usually within 72 hours) and shows in Profile.
// Store-compliant build: no price questions; posting requires accepting the Community Rules.
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react-native";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { queryKeys, useStores } from "../hooks/queries";
import { SUBURBS, TYPE_LABELS } from "../lib/storeUtils";
import { contentProblem } from "../lib/contentFilter";
import { config } from "../config";
import { radius, useTheme } from "../theme/theme";
import type { CreateSubmissionInput, StoreType } from "../types/api";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Checkbox, ErrorText, Skeleton } from "../components/ui/Feedback";
import { Segmented } from "../components/ui/Segmented";
import { SelectSheet } from "../components/ui/SelectSheet";
import { TextField } from "../components/ui/TextField";
import { Screen } from "../components/Screen";
import { SignInCard } from "../components/SignInCard";
import { RequireTerms } from "../components/RequireTerms";

const EMPTY: CreateSubmissionInput = {
  name: "", type: config.listedStoreTypes[0], suburb: "Roodepoort", address: "", whatsapp: null, hoursNote: null, isOwner: false, notes: null,
};

/** Rough duplicate check: two shared meaningful words with a listed store's name. */
function words(n: string) {
  return n.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w.length > 2 && !["the", "club", "lounge", "dispensary", "and"].includes(w));
}

export default function AddStoreScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { authState } = useAuth();
  const { data } = useStores();
  const queryClient = useQueryClient();
  const [f, setF] = useState<CreateSubmissionInput>(EMPTY);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof CreateSubmissionInput>(k: K, v: CreateSubmissionInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: api.createSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mySubmissions });
      setDone(true);
      setF(EMPTY);
    },
    onError: (e: Error) => setError(e.message),
  });

  const nameWords = words(f.name);
  const dup = nameWords.length > 0
    ? data?.stores.find((s) => {
        const w = words(s.name);
        return nameWords.filter((x) => w.includes(x)).length >= Math.min(2, nameWords.length);
      })
    : undefined;

  const submit = () => {
    setError(null);
    if (f.name.trim().length < 2) return setError("Enter the venue's name.");
    if (!f.address.trim() && !f.whatsapp?.trim()) return setError("Add a street address or a WhatsApp number so we can check the venue.");
    const problem = contentProblem(f.notes) ?? contentProblem(f.hoursNote);
    if (problem) return setError(problem);
    create.mutate({ ...f, name: f.name.trim(), address: f.address.trim(), whatsapp: f.whatsapp?.trim() || null, hoursNote: f.hoursNote?.trim() || null, notes: f.notes?.trim() || null });
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <AppText variant="h1" accessibilityRole="header">Suggest a venue</AppText>
        <AppText color="mutedForeground">
          Know a cannabis club or venue that isn't listed? Tell us about it. We check every venue before it goes on the map, usually within 72 hours.
        </AppText>
      </View>

      {authState.type === "loading" ? (
        <Skeleton height={200} />
      ) : authState.type !== "authenticated" ? (
        <SignInCard title="Sign in to suggest a venue" text="It takes one tap. We use it to tell you when your suggestion is approved." />
      ) : done ? (
        <View style={[styles.done, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CircleCheck size={40} color={colors.success} />
          <AppText variant="h2" style={{ fontSize: 21 }}>Thanks, we've got it</AppText>
          <AppText color="mutedForeground">We'll check the venue and add it to the map. You can see its status under Profile.</AppText>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button title="Add another" onPress={() => setDone(false)} />
            <Button title="See my submissions" variant="outline" onPress={() => navigation.navigate("Tabs", { screen: "Profile" })} />
          </View>
        </View>
      ) : (
        <RequireTerms>
        <View style={{ gap: 16 }}>
          <TextField label="Venue name" value={f.name} onChangeText={(v) => set("name", v)} placeholder="e.g. Florida Lake Leaf Club" maxLength={80} />
          {dup ? (
            <View style={[styles.warn, { backgroundColor: colors.accentSoft }]}>
              <AppText style={{ color: colors.accentSoftForeground }}>
                This might already be listed as{" "}
                <AppText variant="bodyBold" style={{ color: colors.accentSoftForeground }} onPress={() => navigation.navigate("Store", { storeId: dup.id })}>
                  {dup.name}
                </AppText>{" "}
                in {dup.suburb}.
              </AppText>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <AppText variant="label">Type</AppText>
            <Segmented<StoreType> accessibilityLabel="Venue type" value={f.type} onChange={(v) => set("type", v)} options={config.listedStoreTypes.map((k) => ({ value: k, label: TYPE_LABELS[k] }))} />
          </View>

          <SelectSheet label="Suburb" value={f.suburb} onChange={(v) => set("suburb", v)} options={Object.keys(SUBURBS).map((s) => ({ value: s, label: s }))} />
          <TextField label="Street address or landmark" value={f.address} onChangeText={(v) => set("address", v)} placeholder="e.g. 12 Ontdekkers Rd, next to the Engen" maxLength={200} />
          <TextField label="WhatsApp or phone number" keyboardType="phone-pad" value={f.whatsapp ?? ""} onChangeText={(v) => set("whatsapp", v)} placeholder="072 000 0000" maxLength={30} />
          <TextField label="Opening hours (optional)" value={f.hoursNote ?? ""} onChangeText={(v) => set("hoursNote", v)} placeholder="e.g. Mon–Sat 10:00–20:00" maxLength={200} />

          <TextField label="Anything else? (optional)" value={f.notes ?? ""} onChangeText={(v) => set("notes", v)} placeholder="Parking, lounge, members only…" multiline maxLength={500} />
          <Checkbox checked={f.isOwner} onChange={(v) => set("isOwner", v)} label="I own or manage this venue" />

          {error ? <ErrorText text={error} /> : null}
          <Button title="Send for approval" size="lg" onPress={submit} loading={create.isPending} />
        </View>
        </RequireTerms>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  done: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 24, paddingHorizontal: 16, gap: 12 },
  warn: { padding: 12, borderRadius: radius.md },
});
