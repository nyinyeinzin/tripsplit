export function matchingCityNames(cities, query) {
  const prefix = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  if (!prefix) return [];

  const names = new Map();
  for (const city of cities) {
    const name = city.name?.trim();
    if (!name) continue;
    const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    if (key.startsWith(prefix) && !names.has(key)) names.set(key, name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
