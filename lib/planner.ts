import { Coordinate, Input, Plan, Station, Stop, Vehicle, vehicles } from './types';

export function km(a: Coordinate, b: Coordinate): number {
  const r = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * r / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin((b[0] - a[0]) * r / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Integrate an approximate charging curve, including a five-minute connection allowance.
export function chargingMinutes(from: number, to: number, vehicle: Vehicle, power: number): number {
  let minutes = 5;
  for (let soc = from; soc < to; soc += 1) {
    const fraction = Math.min(1, to - soc);
    const taper = soc < 50 ? 0.85 : soc < 70 ? 0.65 : soc < 80 ? 0.45 : 0.25;
    minutes += vehicle.capacity * fraction / 100 / (Math.min(power, vehicle.maxPower) * taper) * 60;
  }
  return Math.ceil(minutes);
}

export function calculate(input: Input, geometry: Coordinate[], distance: number, drivingMinutes: number, stations: Station[], labels?: [string, string]): Plan {
  const vehicle = vehicles.find(v => v.id === input.vehicleId);
  if (!vehicle) throw new Error('Véhicule inconnu.');
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(drivingMinutes) || drivingMinutes <= 0) throw new Error('Itinéraire invalide.');
  if (!Number.isFinite(input.battery) || !Number.isFinite(input.reserve) || input.battery > 100 || input.reserve < 5 || input.reserve > 30 || input.battery <= input.reserve || !Number.isFinite(input.price) || input.price < 0 || input.price > 3 || Number.isNaN(Date.parse(input.departure))) throw new Error('Vérifiez la batterie, la réserve, le tarif et la date.');
  const candidates = stations.filter(s => !input.excluded.includes(s.id) && s.power >= 40 && s.progress > 0 && s.progress < distance).sort((a, b) => a.progress - b.progress);
  const consumption = vehicle.consumption;
  const energyPerKm = consumption / 100;
  let position = 0, energy = vehicle.capacity * input.battery / 100, charging = 0, detourMinutes = 0;
  const stops: Stop[] = [];
  while (energy - (distance - position) * energyPerKm < vehicle.capacity * input.reserve / 100 - 1e-8) {
    const reachable = candidates.filter(s => s.progress > position + 1 && energy - (s.progress - position + s.offset) * energyPerKm >= vehicle.capacity * input.reserve / 100);
    const next = reachable.at(-1);
    if (!next) throw new Error('Aucune borne rapide compatible trouvée avant la réserve de batterie. Augmentez la batterie de départ, réduisez la réserve ou essayez un autre trajet.');
    energy -= (next.progress - position + next.offset) * energyPerKm;
    const arrivalBattery = energy / vehicle.capacity * 100;
    const neededToFinish = ((distance - next.progress + next.offset) * energyPerKm / vehicle.capacity * 100) + input.reserve;
    const targetBattery = Math.min(90, Math.max(80, neededToFinish <= 90 ? neededToFinish : 80));
    const added = (targetBattery - arrivalBattery) / 100 * vehicle.capacity;
    if (added <= 0) throw new Error('Recharge impossible avec ces paramètres.');
    const minutes = chargingMinutes(arrivalBattery, targetBattery, vehicle, next.power);
    detourMinutes += next.offset / 40 * 60;
    stops.push({ ...next, arrivalBattery, targetBattery, minutes, cost: added * input.price, energy: added, arrivalMinutes: next.progress / distance * drivingMinutes + charging + detourMinutes });
    charging += minutes;
    detourMinutes += next.offset / 40 * 60;
    energy = vehicle.capacity * targetBattery / 100 - next.offset * energyPerKm;
    position = next.progress;
    if (stops.length > 20) throw new Error('Trajet trop long : limitez le nombre d’étapes.');
  }
  const detourKm = stops.reduce((sum, s) => sum + 2 * s.offset, 0);
  return { input, vehicle, origin: labels?.[0] ?? input.origin, destination: labels?.[1] ?? input.destination,
    geometry, distance: distance + detourKm, drivingMinutes: drivingMinutes + detourMinutes,
    chargingMinutes: charging, totalMinutes: drivingMinutes + detourMinutes + charging,
    cost: stops.reduce((sum, s) => sum + s.cost, 0), finalBattery: (energy - (distance - position) * energyPerKm) / vehicle.capacity * 100,
    stops, calculatedAt: new Date().toISOString(),
    warnings: input.mode === 'demo' ? ['Démonstration : trajet et stations fictifs. Ne pas utiliser pour voyager.'] : ['Estimation expérimentale : consommation constante, sans météo, relief ni trafic.', 'Disponibilité, accès, compatibilité de votre véhicule et tarifs des bornes à vérifier avant le départ.', 'Les détours sont estimés à vol d’oiseau ; le tracé routier représente le trajet principal.'],
    attribution: input.mode === 'demo' ? 'Données fictives de démonstration' : 'Itinéraire OSRM · Géocodage Photon · Bornes © OpenStreetMap contributors' };
}

export function demo(input: Input): Plan {
  const geometry: Coordinate[] = [[6.12,46.31],[6.08,46.12],[5.93,45.90],[5.91,45.57],[5.72,45.19],[5.06,44.93],[4.87,44.14],[5.04,43.83],[5.45,43.53],[6.15,43.47],[6.76,43.44],[7.26,43.70]];
  const stations: Station[] = [
    { id:'demo-1',name:'Aire de Valence · exemple',network:'Réseau fictif',coordinate:[5.06,44.93],progress:240,power:150,powerEstimated:false,offset:0 },
    { id:'demo-2',name:'Aire de Montélimar · exemple',network:'Réseau fictif',coordinate:[4.88,44.55],progress:280,power:150,powerEstimated:false,offset:0 },
    { id:'demo-3',name:'Aire de Provence · exemple',network:'Réseau fictif',coordinate:[5.45,43.53],progress:430,power:150,powerEstimated:false,offset:0 },
    { id:'demo-4',name:'Aire de l’Estérel · exemple',network:'Réseau fictif',coordinate:[6.76,43.44],progress:495,power:150,powerEstimated:false,offset:0 }
  ];
  return calculate(input, geometry, 610, 365, stations, ['Sauverny', 'Nice']);
}
