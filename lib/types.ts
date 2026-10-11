export type Coordinate = [number, number];
export type Vehicle = { id: string; name: string; capacity: number; consumption: number; maxPower: number };
export type Station = { id: string; name: string; network: string; coordinate: Coordinate; power: number; powerEstimated: boolean; progress: number; offset: number };
export type Stop = Station & { arrivalBattery: number; targetBattery: number; minutes: number; cost: number; arrivalMinutes: number; energy: number };
export type Input = { origin: string; destination: string; vehicleId: string; departure: string; battery: number; reserve: number; price: number; mode: 'demo' | 'live'; excluded: string[] };
export type Plan = { input: Input; origin: string; destination: string; vehicle: Vehicle; geometry: Coordinate[]; distance: number; drivingMinutes: number; chargingMinutes: number; totalMinutes: number; cost: number; finalBattery: number; stops: Stop[]; calculatedAt: string; warnings: string[]; attribution: string };
export const vehicles: Vehicle[] = [
  { id: 'model-y', name: 'Tesla Model Y Propulsion', capacity: 60, consumption: 18, maxPower: 170 },
  { id: 'model-3', name: 'Tesla Model 3 Propulsion', capacity: 60, consumption: 16, maxPower: 170 },
  { id: 'ioniq-5', name: 'Hyundai IONIQ 5 · 77 kWh', capacity: 77.4, consumption: 20, maxPower: 220 },
  { id: 'megane', name: 'Renault Mégane E-Tech · 60 kWh', capacity: 60, consumption: 18, maxPower: 130 }
];
export function defaultInput(): Input {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return { origin: 'Sauverny, France', destination: 'Nice, France', vehicleId: 'model-y', departure: local, battery: 100, reserve: 15, price: 0.59, mode: 'demo', excluded: [] };
}
