// Sign in: Google first, email + password as the alternative, plus register.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../theme/theme";
import { SignInButtons } from "../components/SignInCard";
import type { RootStackParamList } from "../navigation/types";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { ErrorText } from "../components/ui/Feedback";
import { Segmented } from "../components/ui/Segmented";
import { TextField } from "../components/ui/TextField";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { onSignedIn } = useAuth();
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      mode === "signin"
        ? api.signInWithPassword({ email: email.trim(), password })
        : api.register({ email: email.trim(), password, displayName: name.trim() }),
    onSuccess: async (res) => {
      await onSignedIn(res);
      navigation.goBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const onSubmit = () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (mode === "register" && password.length < 8) return setError("Password must be at least 8 characters.");
    if (mode === "register" && !name.trim()) return setError("Enter your name.");
    if (!password) return setError("Enter your password.");
    submit.mutate();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="h1" accessibilityRole="header">Sign in</AppText>
          <AppText color="mutedForeground">Browsing venues doesn't need an account. You need one to write reviews or suggest a venue.</AppText>
          <SignInButtons onSignedIn={() => navigation.goBack()} />

          {!showEmail ? (
            <Button title="Sign in with email and password instead" variant="ghost" onPress={() => setShowEmail(true)} />
          ) : (
            <View style={{ gap: 12 }}>
              <Segmented
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setError(null);
                }}
                options={[
                  { value: "signin", label: "Sign in" },
                  { value: "register", label: "Create account" },
                ]}
              />
              {mode === "register" ? <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" /> : null}
              <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "signin" ? "password" : "new-password"} hint={mode === "register" ? "At least 8 characters." : undefined} />
              {error ? <ErrorText text={error} /> : null}
              <Button title={mode === "signin" ? "Sign in" : "Create account"} size="lg" onPress={onSubmit} loading={submit.isPending} />
            </View>
          )}
          <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
});
