// App configuration. Values come from app.json -> expo.extra so each build
// (dev / staging / production) can point at a different backend.
import Constants from "expo-constants";
import type { StoreType } from "./types/api";

type Extra = {
  apiBaseUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  supportEmail?: string;
  privacyUrl?: string;
  termsUrl?: string;
  communityRulesUrl?: string;
  deleteAccountUrl?: string;
  listedStoreTypes?: StoreType[];
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const ALL_TYPES: StoreType[] = ["dispensary", "club", "lounge"];

export const config = {
  /** Base URL of the backend, no trailing slash. Endpoints are appended, e.g. `${apiBaseUrl}/stores/list`. */
  apiBaseUrl: (extra.apiBaseUrl ?? "").replace(/\/$/, ""),
  google: {
    webClientId: extra.googleWebClientId ?? "",
    iosClientId: extra.googleIosClientId ?? "",
    androidClientId: extra.googleAndroidClientId ?? "",
  },
  /** Required by both app stores: support contact, privacy policy, terms, and a web page to request account deletion. */
  legal: {
    supportEmail: extra.supportEmail ?? "",
    privacyUrl: extra.privacyUrl ?? "",
    termsUrl: extra.termsUrl ?? "",
    communityRulesUrl: extra.communityRulesUrl ?? "",
    deleteAccountUrl: extra.deleteAccountUrl ?? "",
  },
  /**
   * Which venue types this build shows. Set to ["club","lounge"] in app.json to launch
   * without retail dispensaries (lower app-review risk, see APP-STORE-COMPLIANCE.md 4.1).
   */
  listedStoreTypes: (extra.listedStoreTypes?.length ? extra.listedStoreTypes : ALL_TYPES).filter((t) => ALL_TYPES.includes(t)),
};
