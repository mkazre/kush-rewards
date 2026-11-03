// App entry: fonts, data caching, theme, safe areas, toasts, session, location,
// navigation and the 18+ gate.
import { useEffect, useMemo, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { SchibstedGrotesk_600SemiBold, SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold } from "@expo-google-fonts/schibsted-grotesk";
import { Righteous_400Regular } from "@expo-google-fonts/righteous";
import { ThemeProvider, useTheme } from "./src/theme/theme";
import { ToastProvider } from "./src/components/ui/Feedback";
import { AuthProvider } from "./src/hooks/useAuth";
import { UserLocationProvider, useUserLocation } from "./src/hooks/useUserLocation";
import { WelcomeScreens } from "./src/components/WelcomeScreens";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { AgeGate } from "./src/components/AgeGate";

// Keep the native launch screen (logo) up until the fonts are ready.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ThemedApp() {
  const { colors, isDark } = useTheme();
  const navTheme: Theme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.card, text: colors.foreground, border: colors.border, notification: colors.accent },
    };
  }, [colors, isDark]);

  return (
    <ToastProvider>
      <AuthProvider>
        <UserLocationProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <RootNavigator />
          </NavigationContainer>
          <LaunchFlow />
        </UserLocationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

/** Age check → welcome screens → ask for location, in that order, so prompts never overlap. */
function LaunchFlow() {
  const [stage, setStage] = useState<"age" | "welcome" | "done">("age");
  const { autoLocate } = useUserLocation();
  useEffect(() => {
    if (stage === "done") autoLocate();
  }, [stage, autoLocate]);
  return (
    <>
      <AgeGate onPassed={() => setStage((s) => (s === "age" ? "welcome" : s))} />
      {stage === "welcome" ? <WelcomeScreens onDone={() => setStage("done")} /> : null}
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    Righteous_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1611" }}>
        <ActivityIndicator color="#57b784" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
