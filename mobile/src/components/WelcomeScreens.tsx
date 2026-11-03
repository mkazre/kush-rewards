// Welcome (splash) screens from Admin → Splash screens on the website. Shown after the age check:
// once per version ("first time only") or on every app start ("every time"). Swipe or tap Next.
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradientLike } from "./LinearGradientLike";
import { Compass, Heart, Leaf, MapPin, MessageCircle, PartyPopper, ShieldCheck, Sparkles, Star, Users, type LucideIcon } from "lucide-react-native";
import { api } from "../api/endpoints";
import { storage } from "../lib/storage";
import { fonts } from "../theme/theme";
import type { SplashScreen } from "../types/api";
import { AppText } from "./ui/AppText";

const ICONS: Record<string, LucideIcon> = {
  leaf: Leaf,
  "map-pin": MapPin,
  star: Star,
  "message-circle": MessageCircle,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  heart: Heart,
  users: Users,
  compass: Compass,
  "party-popper": PartyPopper,
};

const SEEN_KEY = "kr-splash-seen";

function Slide({ s }: { s: SplashScreen }) {
  const { width, height } = useWindowDimensions();
  const Icon = ICONS[s.icon ?? "leaf"] ?? Leaf;
  const full = s.layout === "full" && !!s.imageUrl;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: s.bgColor }]}>
      {full ? (
        <>
          <Image source={{ uri: s.imageUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          <LinearGradientLike overlay={s.overlay} />
        </>
      ) : null}
      <View style={[styles.content, full ? { justifyContent: "flex-end", paddingBottom: height * 0.24 } : { justifyContent: "center", paddingBottom: 120 }]}>
        {s.layout === "block" && s.imageUrl ? (
          <Image source={{ uri: s.imageUrl }} style={{ width: width * 0.72, height: height * 0.36, borderRadius: 28 }} contentFit="contain" transition={250} />
        ) : null}
        {s.layout === "icon" ? (
          <View style={[styles.iconRing, { backgroundColor: `${s.accentColor}22`, borderColor: `${s.accentColor}18` }]}>
            <Icon size={64} color={s.accentColor} strokeWidth={1.75} />
          </View>
        ) : null}
        {s.heading ? <AppText style={[styles.heading, { color: s.textColor }]}>{s.heading}</AppText> : null}
        {s.body ? <AppText style={[styles.body, { color: s.textColor }]}>{s.body}</AppText> : null}
      </View>
    </View>
  );
}

export const WelcomeScreens = ({ onDone }: { onDone: () => void }) => {
  const insets = useSafeAreaInsets();
  const { data, isError } = useQuery({ queryKey: ["splash"], queryFn: api.splash, retry: 1, staleTime: 5 * 60_000 });
  const [visible, setVisible] = useState<boolean | null>(null);
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const screens = data?.screens ?? [];

  // Decide whether to show: nothing to show (or offline) means go straight to the app.
  useEffect(() => {
    if (isError) {
      setVisible(false);
      onDone();
      return;
    }
    if (!data) return;
    if (data.mode === "off" || screens.length === 0) {
      setVisible(false);
      onDone();
      return;
    }
    if (data.mode === "every_launch") {
      setVisible(true);
      return;
    }
    storage.get(SEEN_KEY).then((seen) => {
      const show = seen !== data.version;
      setVisible(show);
      if (!show) onDone();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isError]);

  // Load the images up front so swiping is instant.
  useEffect(() => {
    const urls = screens.map((s) => s.imageUrl).filter((u): u is string => !!u);
    if (urls.length) Image.prefetch(urls).catch(() => undefined);
  }, [screens]);

  const go = (next: number) => {
    if (next < 0 || next >= screens.length) return;
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setI(next);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const finish = () => {
    if (data) storage.set(SEEN_KEY, data.version);
    setVisible(false);
    onDone();
  };

  const index = useRef(0);
  index.current = i;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) go(index.current + 1);
        else if (g.dx > 50) go(index.current - 1);
      },
    })
  ).current;

  if (!visible || !screens.length) return null;
  const s = screens[Math.min(i, screens.length - 1)];
  const last = i >= screens.length - 1;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <View style={{ flex: 1, backgroundColor: s.bgColor }} {...pan.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Slide s={s} />
        </Animated.View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <View style={styles.dots}>
            {screens.map((x, n) => (
              <View key={x.id} style={[styles.dot, { width: n === i ? 24 : 8, backgroundColor: n === i ? s.accentColor : `${s.textColor}55` }]} />
            ))}
          </View>
          <View style={styles.buttons}>
            {!last ? (
              <Pressable onPress={finish} style={styles.btn} accessibilityRole="button">
                <AppText style={[styles.btnText, { color: s.textColor }]}>Skip</AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => (last ? finish() : go(i + 1))}
              style={[styles.btn, { backgroundColor: s.accentColor }]}
              accessibilityRole="button"
            >
              <AppText style={[styles.btnText, { color: s.bgColor }]}>{last ? "Get started" : "Next"}</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", paddingHorizontal: 32, gap: 18 },
  iconRing: { width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center", borderWidth: 14 },
  heading: { fontFamily: fonts.displayExtraBold, fontSize: 30, lineHeight: 36, textAlign: "center" },
  body: { fontSize: 17, lineHeight: 25, textAlign: "center", opacity: 0.88 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, gap: 20, alignItems: "center" },
  dots: { flexDirection: "row", gap: 8 },
  dot: { height: 8, borderRadius: 4 },
  buttons: { flexDirection: "row", gap: 12, width: "100%", maxWidth: 420 },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16 },
});
