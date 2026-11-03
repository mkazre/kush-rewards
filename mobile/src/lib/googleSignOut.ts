// Clears the cached Google account so the account picker shows on the next Google sign-in.
import { GoogleSignin } from "@react-native-google-signin/google-signin";

export async function googleSignOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* not signed in with Google, or Google sign-in not configured */
  }
}
