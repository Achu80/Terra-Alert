/**
 * The small web page that runs inside LeafletMap's WebView.
 * Leaflet 1.9.4 + OpenStreetMap tiles - the same map library and tiles as the web frontend.
 *
 * Messages to React Native (window.ReactNativeWebView.postMessage):
 *   { type: 'ready' } | { type: 'press', lat, lon } | { type: 'error', message }
 * Functions React Native calls through injectJavaScript:
 *   setMarker(marker | null), setHeat(heat | null), flyTo({ lat, lon, zoom })
 */

// Embed config safely inside a <script> tag
const toScriptJson = (value) => JSON.stringify(value ?? null).replace(/</g, '\\u003c');

export function buildLeafletHtml(config) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #0b1220; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var cfg = ${toScriptJson(config)};

  function send(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (!window.L) {
    send({ type: 'error', message: 'Map library could not be loaded. Check the internet connection.' });
    return;
  }

  var map = L.map('map', {
    zoomControl: cfg.interactive,
    dragging: cfg.interactive,
    touchZoom: cfg.interactive,
    doubleClickZoom: cfg.interactive,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Keep the map inside Himachal Pradesh, like the web InteractiveMap (maxBounds + viscosity 1)
  if (cfg.bounds) {
    var hp = L.latLngBounds([cfg.bounds.south, cfg.bounds.west], [cfg.bounds.north, cfg.bounds.east]);
    map.setMaxBounds(hp.pad(0.05));
    map.options.maxBoundsViscosity = 1.0;
    map.setMinZoom(7);
  }

  map.setView([cfg.center.lat, cfg.center.lon], cfg.zoom);

  // ---- marker ----
  var marker = null;
  window.setMarker = function (m) {
    if (marker) { map.removeLayer(marker); marker = null; }
    if (!m) return;
    marker = L.marker([m.lat, m.lon]).addTo(map);
    if (m.title) {
      marker.bindPopup('<b>' + esc(m.title) + '</b>' + (m.subtitle ? '<br>' + esc(m.subtitle) : ''));
    }
  };

  window.flyTo = function (c) {
    map.flyTo([c.lat, c.lon], c.zoom || map.getZoom(), { duration: 0.6 });
  };

  // ---- risk rings (same colour scale as the web RiskHeatmap) ----
  var STOPS = [
    [0, [30, 136, 229]], [0.2, [67, 160, 71]], [0.4, [124, 179, 66]],
    [0.6, [253, 216, 53]], [0.8, [251, 140, 0]], [1, [211, 47, 47]]
  ];
  function heatColor(t) {
    t = Math.max(0, Math.min(1, t));
    var i = 0;
    while (i < STOPS.length - 2 && t > STOPS[i + 1][0]) i++;
    var a = STOPS[i], b = STOPS[i + 1], f = (t - a[0]) / (b[0] - a[0]);
    var rgb = a[1].map(function (v, k) { return Math.round(v + f * (b[1][k] - v)); });
    return 'rgb(' + rgb.join(',') + ')';
  }

  var heatLayer = L.layerGroup().addTo(map);
  window.setHeat = function (h) {
    heatLayer.clearLayers();
    if (!h) return;
    var base = h.score / 100;
    // Largest ring first so the smaller, stronger rings sit on top; overlaps darken towards the centre
    for (var ring = 5; ring >= 1; ring--) {
      L.circle([h.lat, h.lon], {
        radius: ring * 3000,
        stroke: false,
        fillColor: heatColor(Math.max(0.1, base * Math.pow(0.85, ring))),
        fillOpacity: 0.22,
        interactive: false,
      }).addTo(heatLayer);
    }
    L.circle([h.lat, h.lon], {
      radius: 1200,
      stroke: false,
      fillColor: heatColor(Math.max(0.1, base)),
      fillOpacity: 0.45,
      interactive: false,
    }).addTo(heatLayer);
  };

  if (cfg.tappable) {
    map.on('click', function (e) {
      send({ type: 'press', lat: e.latlng.lat, lon: e.latlng.lng });
    });
  }

  window.setMarker(cfg.marker);
  window.setHeat(cfg.heat);
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
