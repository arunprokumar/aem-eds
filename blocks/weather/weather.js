export default async function decorate(block) {
  const config = Object.fromEntries([...block.children].map((row) => {
    const cells = [...row.children];
    return [cells[0]?.textContent.trim().toLowerCase(), cells[1]?.textContent.trim()];
  }).filter(([key, value]) => key && value));
  const city = config.city || 'Stockholm';
  const endpoint = config.endpoint || 'http://localhost:3001/weather';

  block.textContent = '';
  const status = document.createElement('p');
  status.className = 'weather-loading';
  status.textContent = `Loading weather for ${city}...`;
  block.append(status);

  try {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('city', city);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const data = await response.json();

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
    console.error('Weather block error:', error);
  }
}
