const coordinatePair = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

function coordinates(value) {
  const match = value?.match(coordinatePair);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
}

export function parseMapLink(input) {
  let url;
  try { url = new URL(input.trim()); }
  catch { throw new Error("Paste a full Google Maps or Apple Maps link starting with https://."); }
  const host = url.hostname.toLowerCase();
  const google = (/^(?:www\.|maps\.)?google\.(?:com|co\.[a-z]{2}|[a-z]{2,3})$/.test(host) && (host.startsWith("maps.") || url.pathname.startsWith("/maps")))
    || host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps/"));
  const apple = host === "maps.apple.com";
  if (url.protocol !== "https:" || (!google && !apple) || url.username || url.password) {
    throw new Error("Use an HTTPS link from Google Maps or Apple Maps.");
  }
  const path = url.pathname;
  const at = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const embedded = path.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const point = coordinates(at ? `${at[1]},${at[2]}` : embedded ? `${embedded[1]},${embedded[2]}` : null)
    || ["ll", "sll", "center", "q", "query"].map((key) => coordinates(url.searchParams.get(key))).find(Boolean)
    || null;
  return { url: url.href, ...point };
}
