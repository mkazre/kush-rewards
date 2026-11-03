// Native Google sign-in (Android: Google Play services account picker; iOS: Google SDK).
// The client IDs come from Admin → Settings on the website (GET /config), falling back to
// app.json, so they can be set or changed without releasing a new app. The phone gets a
// Google ID token, and the backend verifies it and returns our session (POST /auth/google).
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import { api } from "../api/endpoints";
import { config } from "../config";
import { useAuth } from "./useAuth";
import { useSiteConfig } from "./queries";

let configuredWith = "";

export function useGoogleSignIn(onDone?: () => void) {
  const { onSignedIn } = useAuth();
  const { data: site } = useSiteConfig();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The ID token's audience is the web client ID, which the backend accepts.
  const webClientId = site?.googleWebClientId || config.google.webClientId;
  const iosClientId = site?.googleIosClientId || config.google.iosClientId;
  // iOS also needs its URL scheme baked into the build (see app.config.js), so it needs the iOS client ID.
  const available = !!webClientId && (Platform.OS !== "ios" || !!iosClientId);

  useEffect(() => {
    const key = `${webClientId}|${iosClientId}`;
    if (!available || configuredWith === key) return;
    GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined, scopes: ["email", "profile"] });
    configuredWith = key;
  }, [available, webClientId, iosClientId]);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return; // cancelled
      const idToken = res.data.idToken;
      if (!idToken) throw new Error("Google didn't return a sign-in token.");
      await onSignedIn(await api.signInWithGoogle({ idToken }));
      onDone?.();
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return;
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError("Google Play services isn't available on this phone. Sign in with email instead.");
          return;
        }
        // DEVELOPER_ERROR (code 10) means the Android client's SHA-1 isn't registered in Google Cloud.
        setError("Google sign-in isn't set up for this app yet. Sign in with email instead.");
        return;
      }
      setError((e as Error).message || "Google sign-in didn't finish. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { start, available, ready: available, busy, error };
}
