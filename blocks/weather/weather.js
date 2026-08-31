async function fetchOpenMeteo(city) {
  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodingUrl.search = new URLSearchParams({
    name: city, count: '1', language: 'en', format: 'json',
  });
  const geocodingResponse = await fetch(geocodingUrl);
  if (!geocodingResponse.ok) throw new Error('Geocoding request failed');
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
  if (!forecastResponse.ok) throw new Error('Forecast request failed');
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
  return {
    location: place.name,
    temperature: forecast.current?.temperature_2m,
    condition: conditions[forecast.current?.weather_code] || 'Unknown',
  };
}

export default async function decorate(block) {
  const config = Object.fromEntries([...block.children].map((row) => {
    const cells = [...row.children];
    return [cells[0]?.textContent.trim().toLowerCase(), cells[1]?.textContent.trim()];
  }).filter(([key, value]) => key && value));
  const city = config.city || 'Stockholm';
  const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const endpoint = config.endpoint || (isLocalDev ? 'http://localhost:3001/weather' : null);

  block.textContent = '';
  const status = document.createElement('p');
  status.className = 'weather-loading';
  status.textContent = `Loading weather for ${city}...`;
  block.append(status);

  try {
    let data;
    if (endpoint) {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('city', city);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
      data = await response.json();
    } else {
      data = await fetchOpenMeteo(city);
    }

    const card = document.createElement('div');
    card.className = 'weather-card';
    const title = document.createElement('h3');
    title.textContent = data.location || city;
    const temperature = document.createElement('p');
    temperature.className = 'weather-temperature';
    temperature.textContent = `${data.temperature ?? '--'}°C`;
    const condition = document.createElement('p');
    condition.className = 'weather-condition';
    condition.textContent = data.condition || 'Unknown';
    card.append(title, temperature, condition);
    block.replaceChildren(card);
  } catch (error) {
    status.className = 'weather-error';
    status.textContent = `Unable to load weather for ${city}.`;
  }
}
