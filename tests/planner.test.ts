import { describe, expect, it } from 'vitest';
import { calculate, chargingMinutes, demo } from '../lib/planner';
import { defaultInput, Station, vehicles } from '../lib/types';

describe('energy and charging planner', () => {
  const input = defaultInput();
  it('computes a complete trip while keeping the requested reserve', () => {
    const plan = demo(input);
    expect(plan.stops.length).toBeGreaterThan(0);
    expect(plan.finalBattery).toBeGreaterThanOrEqual(input.reserve - 0.001);
    expect(plan.totalMinutes).toBe(plan.drivingMinutes + plan.chargingMinutes);
    expect(plan.cost).toBeCloseTo(plan.stops.reduce((sum,s) => sum+s.energy*input.price,0));
    for(const s of plan.stops) { expect(s.arrivalBattery).toBeGreaterThanOrEqual(input.reserve); expect(s.targetBattery).toBeGreaterThan(s.arrivalBattery); expect(s.targetBattery).toBeLessThanOrEqual(90); }
  });
  it('excludes a station and computes a different feasible sequence', () => {
    const first=demo(input);
    const excluded=first.stops[0].id;
    const second=demo({...input,excluded:[excluded]});
    expect(second.stops.some(s=>s.id===excluded)).toBe(false);
    expect(second.stops[0].id).not.toBe(excluded);
    expect(second.finalBattery).toBeGreaterThanOrEqual(input.reserve-0.001);
  });
  it('fails explicitly when no station is reachable', () => {
    expect(() => calculate(input,[[6,46],[7,43]],600,360,[])).toThrow('Aucune borne');
  });
  it('does not require charging for a short route', () => {
    const plan=calculate(input,[[6,46],[6.1,46.1]],40,45,[]);
    expect(plan.stops).toHaveLength(0);expect(plan.cost).toBe(0);expect(plan.chargingMinutes).toBe(0);
    expect(plan.finalBattery).toBeCloseTo(88);
  });
  it('accounts for detour energy, distance and time', () => {
    const s:Station={id:'test',name:'Test',network:'Test',coordinate:[6,46],power:150,powerEstimated:false,progress:250,offset:4};
    const plan=calculate(input,[[6,46],[7,43]],400,240,[s]);
    expect(plan.distance).toBe(408);expect(plan.drivingMinutes).toBe(252);expect(plan.finalBattery).toBeGreaterThanOrEqual(input.reserve-0.001);
    expect(plan.stops[0].arrivalBattery).toBeCloseTo(23.8);
  });
  it('models slower high-SOC charging and slower station power', () => {
    expect(chargingMinutes(70,90,vehicles[0],150)).toBeGreaterThan(chargingMinutes(20,40,vehicles[0],150));
    expect(chargingMinutes(20,80,vehicles[0],50)).toBeGreaterThan(chargingMinutes(20,80,vehicles[0],150));
  });
  it('rejects invalid battery and reserve values', () => {
    expect(() => demo({...input,battery:10,reserve:15})).toThrow('Vérifiez');
    expect(() => demo({...input,price:-1})).toThrow('Vérifiez');
  });
});
