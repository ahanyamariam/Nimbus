

const { ipcRenderer } = require('electron');
const path = require('path');
const GIF_DIR = path.join(__dirname, 'assets', 'gifs');

// WMO WEATHER CODE → APP WEATHER TYPE MAPPING
// https://open-meteo.com/en/docs#weathervariables
// =============================================
const WMO_MAP = {
  // Clear
  0:  { type: 'sunny',  label: 'Clear Sky' },
  1:  { type: 'sunny',  label: 'Mostly Clear' },
  // Partly cloudy / overcast
  2:  { type: 'cloudy', label: 'Partly Cloudy' },
  3:  { type: 'cloudy', label: 'Overcast' },
  // Fog
  45: { type: 'cloudy', label: 'Foggy' },
  48: { type: 'cloudy', label: 'Icy Fog' },
  // Drizzle
  51: { type: 'rainy',  label: 'Light Drizzle' },
  53: { type: 'rainy',  label: 'Drizzle' },
  55: { type: 'rainy',  label: 'Heavy Drizzle' },
  // Rain
  61: { type: 'rainy',  label: 'Light Rain' },
  63: { type: 'rainy',  label: 'Rainy' },
  65: { type: 'rainy',  label: 'Heavy Rain' },
  // Snow
  71: { type: 'cold',   label: 'Light Snow' },
  73: { type: 'cold',   label: 'Snowy' },
  75: { type: 'cold',   label: 'Heavy Snow' },
  77: { type: 'cold',   label: 'Snow Grains' },
  // Showers
  80: { type: 'rainy',  label: 'Light Showers' },
  81: { type: 'rainy',  label: 'Showers' },
  82: { type: 'rainy',  label: 'Heavy Showers' },
  // Thunderstorm
  95: { type: 'rainy',  label: 'Thunderstorm' },
  96: { type: 'rainy',  label: 'Thunderstorm' },
  99: { type: 'rainy',  label: 'Heavy Storm' },
};


const WEATHER_ICONS = {
  sunny:  '☀️',
  cloudy: '☁️',
  rainy:  '🌧️',
  windy:  '💨',
  cold:   '❄️',
};


function wmoToIcon(code) {
  if (code <= 1)  return WEATHER_ICONS.sunny;
  if (code <= 3)  return WEATHER_ICONS.cloudy;
  if (code <= 67) return WEATHER_ICONS.rainy;
  if (code <= 77) return WEATHER_ICONS.cold;
  if (code <= 82) return WEATHER_ICONS.rainy;
  return WEATHER_ICONS.rainy;
}


function startClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const el = document.getElementById('time-display');
    if (el) el.textContent = `${h}:${m}`;
  }
  tick();
  setInterval(tick, 1000);
}


function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goBack() {
  showPage('page-landing');
}

function closeApp() {
  ipcRenderer.send('close-app');
}


async function fetchWeather() {
  
  showPage('page-weather');
  startClock();

  const tempEl      = document.getElementById('temp-display');
  const feelsEl     = document.getElementById('feels-display');
  const labelEl     = document.getElementById('weather-label');
  const tempsRow    = document.getElementById('forecast-temps');
  const iconsRow    = document.getElementById('forecast-icons');

  tempEl.textContent  = '--°C';
  feelsEl.textContent = '--°C';
  labelEl.textContent = 'Loading...';
  labelEl.classList.add('loading-pulse');

  try {
    // 1. Get user coordinates via browser geolocation
    const coords = await getCoords();
    const { latitude: lat, longitude: lon } = coords;

    // 2. Fetch from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,weather_code` +
      `&temperature_unit=celsius` +
      `&wind_speed_unit=kmh` +
      `&forecast_days=1`;

    const res  = await fetch(url);
    const data = await res.json();

    const current = data.current;
    const hourly  = data.hourly;

    // 3. Parse current weather
    const temp      = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const wmoCode   = current.weather_code;
    const windSpeed = current.wind_speed_10m;

    // 4. Determine weather type
    // Windy check: if wind > 40 km/h override to windy
    // Cold check:  if temp < 5°C override to cold
    let weatherInfo = WMO_MAP[wmoCode] || { type: 'cloudy', label: 'Cloudy' };
    if (windSpeed > 40) {
      weatherInfo = { type: 'windy', label: 'Windy' };
    } else if (temp < 5) {
      weatherInfo = { type: 'cold', label: 'Cold' };
    }

    const { type, label } = weatherInfo;

    // 5. Update UI
    tempEl.textContent       = `${temp}°C`;
    feelsEl.textContent      = `${feelsLike}°C`;
    labelEl.textContent      = label;
    labelEl.classList.remove('loading-pulse');

    // 6. Set weather class on body (changes bg colour + can swap gifs)
    document.body.className  = `weather-${type}`;

    // 7. Swap background GIF
    const bgGif = document.getElementById('weather-bg-gif');
    if (bgGif) bgGif.src = `file://${GIF_DIR}/${type}.gif`;

    // 8. Build hourly forecast (next 7 hours from current hour)
    const nowHour = new Date().getHours();
    tempsRow.innerHTML = '';
    iconsRow.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const idx = nowHour + i;
      if (idx >= hourly.temperature_2m.length) break;

      const hTemp = Math.round(hourly.temperature_2m[idx]);
      const hCode = hourly.weather_code[idx];
      const hHour = (nowHour + i) % 24;
      const label = i === 0 ? 'Now' : `${String(hHour).padStart(2,'0')}h`;

      const tempCell = document.createElement('div');
      tempCell.className = 'forecast-hour';
      tempCell.innerHTML = `<div style="font-size:10px;color:#a8d8ff;margin-bottom:2px">${label}</div>${hTemp}°`;
      tempsRow.appendChild(tempCell);

      const iconCell = document.createElement('div');
      iconCell.className = 'forecast-weather-icon';
      iconCell.textContent = wmoToIcon(hCode);
      iconsRow.appendChild(iconCell);
    }

  } catch (err) {
    console.error('Weather fetch error:', err);
    labelEl.textContent = 'No signal :(';
    labelEl.classList.remove('loading-pulse');
    tempEl.textContent = '--°C';
    feelsEl.textContent = '--°C';
  }
}

// =============================================
// GEOLOCATION HELPER
// =============================================
function getCoords() {
  // Hardcoded to Bangalore — instant, no geolocation needed
  return Promise.resolve({ latitude: 12.9352, longitude: 77.6245 });
}