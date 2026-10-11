'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Plan } from '@/lib/types';
import RouteSketch from './RouteSketch';
export default function TripMap({ plan, selected, onSelect }: { plan: Plan; selected?: string; onSelect: (id:string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const callback = useRef(onSelect); callback.current = onSelect;
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: container.current, attributionControl: { compact: true }, style: {
        version:8, sources:{ osm:{ type:'raster', tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize:256, attribution:'© OpenStreetMap contributors', maxzoom:19 } }, layers:[{id:'base',type:'raster',source:'osm'}]
      }, center: [6,45], zoom:5 });
    } catch { setFallback(true); return; }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass:false }), 'top-right');
    map.on('error', () => setFallback(true));
    return () => { map.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const update = () => {
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
      map.addSource('route', {type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:plan.geometry}}});
      map.addLayer({id:'route',type:'line',source:'route',paint:{'line-color':'#167562','line-width':5}});
      markers.current.forEach(m => m.remove());
      const endpoints = [plan.geometry[0], plan.geometry.at(-1)!];
      markers.current = endpoints.map((p,i) => { const el = document.createElement('div'); el.className = 'map-endpoint'; el.textContent = i === 0 ? 'D' : 'A'; return new maplibregl.Marker({element:el}).setLngLat(p).addTo(map); });
      plan.stops.forEach((s,i) => { const el = document.createElement('button'); el.className='map-stop'; el.textContent=String(i+1); el.setAttribute('aria-label',`Sélectionner ${s.name}`); el.addEventListener('click',() => callback.current(s.id)); markers.current.push(new maplibregl.Marker({element:el}).setLngLat(s.coordinate).addTo(map)); });
      const bounds = new maplibregl.LngLatBounds(); plan.geometry.forEach(p => bounds.extend(p)); plan.stops.forEach(s => bounds.extend(s.coordinate)); map.fitBounds(bounds,{padding:45,duration:500});
    };
    if (map.isStyleLoaded()) update(); else map.once('load',update);
    return () => { map.off('load',update); };
  }, [plan]);
  useEffect(() => {
    const map = mapRef.current, stop = plan.stops.find(s => s.id === selected);
    if (map && stop) map.flyTo({center:stop.coordinate,zoom:10,duration:600});
  }, [selected,plan]);
  const recenter = () => { const map=mapRef.current; if (!map) return; const b = new maplibregl.LngLatBounds(); plan.geometry.forEach(p => b.extend(p)); map.fitBounds(b,{padding:45}); };
  return <div className="map-wrapper">
    <div ref={container} className="trip-map" aria-label="Carte interactive du trajet" />
    {fallback && <div className="map-fallback"><RouteSketch plan={plan} selected={selected} onSelect={onSelect}/><span>Fond de carte indisponible · schéma du trajet</span></div>}
    {!fallback && <button type="button" className="recenter" onClick={recenter}>Recentrer</button>}
    {plan.input.mode === 'demo' && <span className="map-label">Tracé de démonstration</span>}
  </div>;
}
