// One-tap Google sign-in. Gets a Google ID token on the phone, then the backend
// verifies it and returns our own session token (POST /auth/google).
import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { api } from "../api/endpoints";
import { config } from "../config";
import { useAuth } from "./useAuth";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn(onDone?: () => void) {
  const { onSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: config.google.webClientId || undefined,
    iosClientId: config.google.iosClientId || undefined,
    androidClientId: config.google.androidClientId || undefined,
  });

  useEffect(() => {
    if (response?.type !== "success") {
      if (response?.type === "error") setError("Google sign-in didn't finish. Please try again.");
      return;
    }
    const idToken = response.params.id_token;
    if (!idToken) {
      setError("Google didn't return a sign-in token.");
      return;
    }
    setBusy(true);
    setError(null);
    api
      .signInWithGoogle({ idToken })
      .then(async (res) => {
        await onSignedIn(res);
        onDone?.();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return {
    start: () => {
      setError(null);
      promptAsync();
    },
    ready: !!request,
    busy,
    error,
  };
}
