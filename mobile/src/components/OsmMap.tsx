// Real map: OpenStreetMap tiles drawn by Leaflet inside a WebView (no API key needed), the
// same map the website uses. A pin per venue (partners green, others grey), a blue dot for
// "you", zoom fitted to everything shown. Tapping a pin shows its name; tapping that opens the venue.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { radius, useTheme } from "../theme/theme";
import { AppText } from "./ui/AppText";

export type MapPin = { id: number; name: string; subtitle?: string; lat: number; lng: number; partner: boolean };

type Props = {
  pins: MapPin[];
  me?: { lat: number; lng: number } | null;
  onPinPress?: (id: number) => void;
  height?: number;
};

const html = (dark: boolean) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#m{margin:0;height:100%;background:${dark ? "#17211b" : "#e5eae1"};font-family:-apple-system,Roboto,sans-serif}
  ${dark ? ".leaflet-tile-pane{filter:brightness(.75) invert(1) contrast(.9) hue-rotate(180deg) saturate(.4)}" : ""}
  .leaflet-popup-content{margin:10px 12px;font-size:14px}
  .pop b{display:block}.pop span{color:#546459;font-size:12px}.pop a{display:block;margin-top:6px;color:#1d6842;font-weight:700;text-decoration:none}
</style></head><body><div id="m"></div><script>
  var map = L.map('m', { zoomControl: false, attributionControl: true }).setView([-26.14, 27.88], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  function pin(partner) {
    var fill = partner ? '#1d6842' : '#6b7a70';
    return L.divIcon({ className: '', iconSize: [28, 36], iconAnchor: [14, 34], popupAnchor: [0, -30],
      html: '<svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0z" fill="' + fill + '" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="5" fill="#fff"/></svg>' });
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  window.setData = function (data) {
    layer.clearLayers();
    var pts = [];
    data.pins.forEach(function (p) {
      pts.push([p.lat, p.lng]);
      var m = L.marker([p.lat, p.lng], { icon: pin(p.partner) }).addTo(layer);
      if (data.tappable) {
        m.bindPopup('<div class="pop"><b>' + esc(p.name) + '</b><span>' + esc(p.subtitle) + '</span><a href="#" onclick="window.ReactNativeWebView.postMessage(\\'' + p.id + '\\');return false">View venue ›</a></div>');
      }
    });
    if (data.me) {
      pts.push([data.me.lat, data.me.lng]);
      L.circleMarker([data.me.lat, data.me.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2f71da', fillOpacity: 1 }).addTo(layer);
    }
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  };
  window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;

export const OsmMap = ({ pins, me, onPinPress, height = 260 }: Props) => {
  const { colors, isDark } = useTheme();
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = useMemo(() => ({ html: html(isDark), baseUrl: "https://kushrewards.online/" }), [isDark]);
  const payload = JSON.stringify({ pins, me: me ?? null, tappable: !!onPinPress });

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.setData(${payload}); true;`);
  }, [ready, payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = e.nativeEvent.data;
    if (msg === "ready") setReady(true);
    else if (onPinPress && /^\d+$/.test(msg)) onPinPress(Number(msg));
  };

  return (
    <View style={[styles.box, { height, borderColor: colors.border, backgroundColor: colors.surface }]}>
      {failed ? (
        <View style={styles.center}>
          <AppText variant="small" color="mutedForeground">The map couldn't load. Check your connection.</AppText>
        </View>
      ) : (
        <WebView
          key={isDark ? "dark" : "light"}
          ref={ref}
          source={source}
          originWhitelist={["*"]}
          onMessage={onMessage}
          onError={() => setFailed(true)}
          onHttpError={() => undefined}
          javaScriptEnabled
          scrollEnabled={false}
          nestedScrollEnabled
          setSupportMultipleWindows={false}
          style={{ backgroundColor: "transparent" }}
          // OpenStreetMap asks apps to identify themselves.
          applicationNameForUserAgent="KushRewardsSA/2.0"
        />
      )}
      {!ready && !failed ? (
        <View style={[styles.center, StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
});
