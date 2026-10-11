import { Coordinate, Input, Station } from './types';
import { calculate, km } from './planner';

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'EVTrip/0.1', ...init?.headers }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Fournisseur indisponible (HTTP ${response.status}). Réessayez plus tard ou utilisez la démonstration.`);
  return response.json();
}

async function geocode(query: string): Promise<{ coordinate: Coordinate; label: string }> {
  const url = new URL(process.env.PHOTON_URL || 'https://photon.komoot.io/api/');
  url.searchParams.set('q', query); url.searchParams.set('limit', '1'); url.searchParams.set('lang', 'fr');
  const data = await json(url.toString());
  const feature = data.features?.[0];
  if (!feature) throw new Error(`Adresse introuvable : ${query}. Ajoutez une ville et un pays.`);
  const p = feature.properties;
  return { coordinate: feature.geometry.coordinates, label: [p.name, p.city, p.country].filter((v, i, a) => v && a.indexOf(v) === i).join(', ') };
}

export async function livePlan(input: Input) {
  const origin = await geocode(input.origin);
  const destination = await geocode(input.destination);
  const url = new URL(`${process.env.OSRM_URL || 'https://router.project-osrm.org/route/v1/driving/'}${origin.coordinate.join(',')};${destination.coordinate.join(',')}`);
  url.searchParams.set('overview', 'full'); url.searchParams.set('geometries', 'geojson');
  const data = await json(url.toString());
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route) throw new Error('Aucun itinéraire routier trouvé.');
  const geometry = route.geometry.coordinates as Coordinate[];
  const distance = route.distance / 1000;
  if (distance > 1500) throw new Error('Cette première version accepte les trajets jusqu’à 1 500 km.');
  if (geometry.length < 2 || distance < 1) throw new Error('Choisissez deux adresses distinctes, à au moins 1 km.');
  // Sample the main road every ~20 km; only request explicitly tagged rapid CCS chargers.
  const cumulative = [0];
  for (let i = 1; i < geometry.length; i++) cumulative.push(cumulative[i - 1] + km(geometry[i - 1], geometry[i]));
  const length = cumulative.at(-1)!;
  const samples = geometry.filter((_, i) => i === 0 || i === geometry.length - 1 || Math.floor(cumulative[i] / 20) !== Math.floor(cumulative[i - 1] / 20));
  const query = `[out:json][timeout:20];(${samples.map(p => `nwr(around:15000,${p[1]},${p[0]})[amenity=charging_station]["socket:type2_combo"];`).join('')});out center tags;`;
  const charging = await json(process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }) });
  const stations: Station[] = [];
  const seen = new Set<string>();
  for (const element of charging.elements ?? []) {
    const id = `${element.type}/${element.id}`;
    if (seen.has(id)) continue; seen.add(id);
    const tags = element.tags ?? {};
    const output = tags['socket:type2_combo:output'];
    const match = typeof output === 'string' ? output.match(/^\s*(\d+(?:\.\d+)?)\s*(kW|W)\s*$/i) : null;
    if (!match || tags.access === 'private' || tags.access === 'no') continue;
    const power = Number(match[1]) / (match[2].toLowerCase() === 'w' ? 1000 : 1);
    if (power < 40 || power > 1000) continue;
    const coordinate: Coordinate = [element.lon ?? element.center?.lon, element.lat ?? element.center?.lat];
    if (!coordinate.every(Number.isFinite)) continue;
    let offset = Infinity, progress = 0;
    for (let i = 1; i < geometry.length; i++) {
      const a = geometry[i - 1], b = geometry[i];
      const lonScale = Math.cos(coordinate[1] * Math.PI / 180);
      const dx = (b[0] - a[0]) * lonScale, dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, (((coordinate[0] - a[0]) * lonScale * dx) + ((coordinate[1] - a[1]) * dy)) / (dx * dx + dy * dy || 1)));
      const projected: Coordinate = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const gap = km(coordinate, projected);
      if (gap < offset) { offset = gap; progress = (cumulative[i - 1] + t * (cumulative[i] - cumulative[i - 1])) / length * distance; }
    }
    if (offset <= 8) stations.push({ id, name: tags.name || 'Station de recharge CCS', network: tags.brand || tags.operator || 'Réseau non renseigné', coordinate, power, powerEstimated: false, offset, progress });
  }
  return calculate(input, geometry, distance, route.duration / 60, stations, [origin.label, destination.label]);
}
