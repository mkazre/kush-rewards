// "Report wrong info about this venue": pick what's wrong, describe it, send.
// Lands in the admin Reports tab.
import { useState } from "react";
import { View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { REPORT_FIELDS, type ReportField } from "../types/api";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { useToast } from "./ui/Feedback";
import { Sheet } from "./ui/Sheet";
import { TextField } from "./ui/TextField";
import { SignInCard } from "./SignInCard";
import { RequireTerms } from "./RequireTerms";
import { offensiveProblem } from "../lib/contentFilter";

type Props = { open: boolean; onClose: () => void; storeId: number; storeName: string };

export const ReportSheet = ({ open, onClose, storeId, storeName }: Props) => {
  const { authState } = useAuth();
  const toast = useToast();
  const [field, setField] = useState<ReportField>("Hours");
  const [details, setDetails] = useState("");
  const report = useMutation({
    mutationFn: api.createReport,
    onSuccess: () => {
      setDetails("");
      onClose();
      toast.success("Thanks! We'll check it and fix the listing.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onClose={onClose} title="Report wrong info" description={storeName}>
      {authState.type !== "authenticated" ? (
        <SignInCard title="Sign in to report" text="So we can follow up if we need more detail." />
      ) : (
        <RequireTerms>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} accessibilityLabel="What's wrong">
            {REPORT_FIELDS.map((x) => (
              <Chip key={x} label={x} selected={field === x} onPress={() => setField(x)} />
            ))}
          </View>
          <TextField
            placeholder="e.g. Closes at 20:00 on Sundays"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={500}
            accessibilityLabel="Details"
          />
          <Button
            title="Send report"
            size="lg"
            loading={report.isPending}
            disabled={details.trim().length < 3}
            onPress={() => {
              const problem = offensiveProblem(details);
              if (problem) return toast.error(problem);
              report.mutate({ storeId, field, details: details.trim() });
            }}
          />
        </RequireTerms>
      )}
    </Sheet>
  );
};
