import { afterEach, describe, expect, it, vi } from 'vitest';
import { livePlan } from '../lib/providers';
import { defaultInput } from '../lib/types';
afterEach(()=>vi.unstubAllGlobals());
describe('live provider integration',()=>{
  it('uses geocoded addresses, road geometry and explicit rapid CCS stations',async()=>{
    const replies=[
      {features:[{geometry:{coordinates:[0,0]},properties:{name:'Départ',country:'France'}}]},
      {features:[{geometry:{coordinates:[4,0]},properties:{name:'Arrivée',country:'France'}}]},
      {code:'Ok',routes:[{distance:400000,duration:14400,geometry:{coordinates:[[0,0],[2.5,0],[4,0]]}}]},
      {elements:[
        {type:'node',id:1,lon:2.5,lat:0,tags:{name:'Borne réelle',operator:'Opérateur','socket:type2_combo':'2','socket:type2_combo:output':'150 kW'}},
        {type:'node',id:2,lon:2.4,lat:0,tags:{name:'Puissance inconnue','socket:type2_combo':'1'}},
        {type:'node',id:3,lon:2.6,lat:0,tags:{access:'private','socket:type2_combo':'1','socket:type2_combo:output':'150 kW'}}
      ]}
    ];
    const fetcher=vi.fn().mockImplementation(async()=>new Response(JSON.stringify(replies.shift()),{status:200,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetcher);
    const plan=await livePlan({...defaultInput(),mode:'live'});
    expect(fetcher).toHaveBeenCalledTimes(4);expect(plan.origin).toBe('Départ, France');expect(plan.distance).toBeCloseTo(400);
    expect(plan.stops).toHaveLength(1);expect(plan.stops[0].id).toBe('node/1');expect(plan.stops[0].name).toBe('Borne réelle');expect(plan.finalBattery).toBeGreaterThanOrEqual(15-0.001);
    expect(plan.attribution).toContain('OpenStreetMap');expect(plan.warnings.join(' ')).not.toContain('fictif');
  });
  it('reports service failure instead of returning demo data',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('unavailable',{status:503})));
    await expect(livePlan({...defaultInput(),mode:'live'})).rejects.toThrow('HTTP 503');
  });
});
