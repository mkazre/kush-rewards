import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

/** Bottom tabs. "Admin" only appears for users with role "admin". */
export type TabParamList = {
  Discover: undefined;
  Reviews: undefined;
  AddStore: undefined;
  Profile: undefined;
  Admin: undefined;
};

/** Screens pushed on top of the tabs. */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Store: { storeId: number };
  Login: undefined;
  /** In-app Privacy Policy, Terms of Use, Community Rules or Support page. */
  Legal: { doc: "privacy" | "terms" | "community-rules" | "support" };
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;

declare global {
  // Lets useNavigation() know the route names without passing generics everywhere.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
