# 🌤️ Nimbus — Pixel Weather App

A tiny, floating pixel-art desktop weather widget built with Electron.

---

## 🚀 Setup

```bash
cd nimbus
npm install
npm start
```

---

## 📍 Changing Your Location

Location is hardcoded in `renderer.js` at the bottom of the file. Find this line:

```js
return Promise.resolve({ latitude: <latitude>, longitude: <longitude> });
```

Replace the coordinates with your own. To find your lat/lng, Google your city name + "coordinates"
---


## 🖼️ Adding Your GIFs

Drop your gifs into `assets/gifs/` with these exact names:
- `bg.gif` — landing page background
- `sunny.gif`
- `cloudy.gif`
- `rainy.gif`
- `windy.gif`
- `cold.gif`


## 🌐 Weather Data
Uses [Open-Meteo](https://open-meteo.com) — completely free, no API key needed.

---

