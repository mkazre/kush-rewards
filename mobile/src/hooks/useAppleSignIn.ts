// Sign in with Apple (iOS only). Apple requires it whenever an app offers Google
// sign-in (App Review Guideline 4.8). The backend verifies the identity token
// and returns our own session token (POST /auth/apple).
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { api } from "../api/endpoints";
import { useAuth } from "./useAuth";

export function useAppleSignIn(onDone?: () => void) {
  const { onSignedIn } = useAuth();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  const start = async () => {
    setError(null);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!cred.identityToken) {
        setError("Apple didn't return a sign-in token. Please try again.");
        return;
      }
      setBusy(true);
      const res = await api.signInWithApple({
        identityToken: cred.identityToken,
        givenName: cred.fullName?.givenName ?? null,
        familyName: cred.fullName?.familyName ?? null,
      });
      await onSignedIn(res);
      onDone?.();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "ERR_REQUEST_CANCELED") return; // user closed the sheet
      setError((e as Error).message || "Apple sign-in didn't finish. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { available, start, busy, error };
}
