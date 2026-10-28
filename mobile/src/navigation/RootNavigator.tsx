// Bottom tabs (Discover, Reviews, Suggest a venue, Profile, Admin for admins) with
// the venue page, sign-in screen and legal pages pushed on top.
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CirclePlus, Compass, ShieldCheck, Star, UserRound } from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { fonts, useTheme } from "../theme/theme";
import DiscoverScreen from "../screens/DiscoverScreen";
import ReviewsScreen from "../screens/ReviewsScreen";
import AddStoreScreen from "../screens/AddStoreScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AdminScreen from "../screens/AdminScreen";
import StoreScreen from "../screens/StoreScreen";
import LoginScreen from "../screens/LoginScreen";
import LegalScreen from "../screens/LegalScreen";
import type { RootStackParamList, TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  const { colors } = useTheme();
  const { authState } = useAuth();
  const isAdmin = authState.type === "authenticated" && authState.user.role === "admin";
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
      }}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarIcon: ({ color }) => <Compass size={22} color={color} /> }} />
      <Tab.Screen name="Reviews" component={ReviewsScreen} options={{ tabBarIcon: ({ color }) => <Star size={22} color={color} /> }} />
      <Tab.Screen name="AddStore" component={AddStoreScreen} options={{ title: "Suggest", tabBarIcon: ({ color }) => <CirclePlus size={22} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <UserRound size={22} color={color} /> }} />
      {isAdmin ? <Tab.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: ({ color }) => <ShieldCheck size={22} color={color} /> }} /> : null}
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Store" component={StoreScreen} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
