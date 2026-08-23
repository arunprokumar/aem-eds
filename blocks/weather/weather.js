/**
 * Decorates the weather block by reading the author configuration table rows
 * and querying the local Fastly edge compute microserver.
 * @param {Element} block The weather block element
 */
export default async function decorate(block) {
  const config = {};

  // 1. Loop cleanly through the rows generated from the Google Doc table
  const rows = [...block.children];
  rows.forEach((row) => {
    // The first column contains the key (e.g., 'City'), second contains the value ('London')
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent?.trim().toLowerCase().replace(':', '');
      const value = cells[1].textContent?.trim();
      if (key && value) {
        config[key] = value;
      }
    }
  });

  // Extract the city text with a failsafe fallback in case parsing lags
  const city = config.city || 'Sweden';

  // 2. Render a localized loading state inside the block container
  block.innerHTML = `<div class="weather-loading">Polling atmosphere variables for: <b>${city}</b>...</div>`;

  // 3. Use the local edge function during development. Open-Meteo is used
  // directly in production because the public edge-function route is not mapped.
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  try {
    let data;
    if (isLocalDev) {
      const response = await fetch(`http://127.0.0.1:3001/weather?city=${encodeURIComponent(city)}`);
      if (!response.ok) throw new Error(`Backend server responded with error: ${response.status}`);
      data = await response.json();
    } else {
      const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geocodingUrl.search = new URLSearchParams({
        name: city,
        count: '1',
        language: 'en',
        format: 'json',
      });
      const geocodingResponse = await fetch(geocodingUrl);
      if (!geocodingResponse.ok) throw new Error(`Geocoding request failed: ${geocodingResponse.status}`);
      const place = (await geocodingResponse.json()).results?.[0];
      if (!place) throw new Error(`Location not found: ${city}`);

      const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
      forecastUrl.search = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current: 'temperature_2m,weather_code',
        timezone: 'auto',
      });
      const forecastResponse = await fetch(forecastUrl);
      if (!forecastResponse.ok) throw new Error(`Forecast request failed: ${forecastResponse.status}`);
      const forecast = await forecastResponse.json();
      const conditions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Drizzle',
        55: 'Dense drizzle',
        61: 'Light rain',
        63: 'Rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Rain showers',
        82: 'Heavy rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with hail',
      };
      data = {
        location: place.name,
        temperature: forecast.current?.temperature_2m,
        condition: conditions[forecast.current?.weather_code] || 'Unknown',
      };
    }

    // Clear out the temporary loading markup completely
    block.innerHTML = '';

    // 5. Render the layout elements onto the screen
    const weatherCard = document.createElement('div');
    weatherCard.style.padding = '20px';
    weatherCard.style.background = '#1e3c72';
    weatherCard.style.color = '#fff';
    weatherCard.style.borderRadius = '8px';
    weatherCard.style.maxWidth = '300px';
    weatherCard.style.fontFamily = 'sans-serif';

    weatherCard.innerHTML = `
      <h3 style="margin:0 0 5px 0;">${data.location || city}</h3>
      <p style="font-size:1.8rem; font-weight:bold; margin:5px 0;">${data.temperature ?? '--'}°C</p>
      <div style="display:flex; align-items:center; gap:10px;">
         <span>${data.condition || 'Clear'}</span>
         ${data.icon ? `<img src="${data.icon}" alt="sky icon" width="40" height="40" />` : ''}
      </div>
    `;

    block.append(weatherCard);
  } catch (error) {
    block.innerHTML = `<div class="weather-error">Failed loading data for ${city}. Ensure backend is running.</div>`;
    console.error('EDS Local Processing Exception:', error);
  }
}
