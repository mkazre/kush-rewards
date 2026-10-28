// Design tokens ported from the web app (base.css). Light = pale sage ground with
// bottle-green ink; dark = deep forest. Marigold (accent) is the one highlight colour.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { storage } from "../lib/storage";

export const lightColors = {
  background: "#f2f5f0",
  foreground: "#15231b",
  surface: "#e5eae1",
  card: "#ffffff",
  popup: "#ffffff",
  primary: "#1d6842",
  primaryForeground: "#ffffff",
  secondary: "#dbebe0",
  secondaryForeground: "#185838",
  accent: "#e1a52d",
  accentForeground: "#291b00",
  accentSoft: "#fcf0d5",
  accentSoftForeground: "#7a5200",
  muted: "#e0e5dc",
  mutedForeground: "#546459",
  success: "#21784d",
  error: "#b3281e",
  info: "#2f71da",
  border: "#d3dace",
  mapLand: "#dfe7da",
  logoBackground: "#1c1c1c",
  overlay: "rgba(0,0,0,0.5)",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: "#0e1611",
  foreground: "#e5ebe5",
  surface: "#17211b",
  card: "#151e19",
  popup: "#19241e",
  primary: "#57b784",
  primaryForeground: "#09150e",
  secondary: "#1d3528",
  secondaryForeground: "#94d1b0",
  accent: "#e8b245",
  accentForeground: "#291b00",
  accentSoft: "#33270f",
  accentSoftForeground: "#f1cc74",
  muted: "#232f28",
  mutedForeground: "#9bab9e",
  success: "#57b784",
  error: "#ee8177",
  info: "#71a3f4",
  border: "#27342d",
  mapLand: "#19241e",
  logoBackground: "#1c1c1c",
  overlay: "rgba(0,0,0,0.6)",
};

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;
export const radius = { sm: 6, md: 14, base: 10, lg: 18, full: 9999 } as const;

/** Font family names registered in App.tsx with expo-font. */
export const fonts = {
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_500Medium",
  bodySemiBold: "Figtree_600SemiBold",
  bodyBold: "Figtree_700Bold",
  display: "SchibstedGrotesk_700Bold",
  displaySemiBold: "SchibstedGrotesk_600SemiBold",
  displayExtraBold: "SchibstedGrotesk_800ExtraBold",
  brand: "Righteous_400Regular",
} as const;

export type ThemeMode = "light" | "dark" | "auto";

type ThemeCtx = { colors: Colors; isDark: boolean; mode: ThemeMode; setMode: (m: ThemeMode) => void };

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);
const MODE_KEY = "kr-theme-mode";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("auto");

  useEffect(() => {
    storage.get(MODE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "auto") setModeState(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    storage.set(MODE_KEY, m);
  }, []);

  const isDark = mode === "dark" || (mode === "auto" && system === "dark");
  const value = useMemo(() => ({ colors: isDark ? darkColors : lightColors, isDark, mode, setMode }), [isDark, mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
