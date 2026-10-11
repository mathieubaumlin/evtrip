import { Plan } from '@/lib/types';
export default function RouteSketch({ plan, selected, onSelect }: { plan: Plan; selected?: string; onSelect?: (id: string) => void }) {
  const points = [...plan.geometry, ...plan.stops.map(s => s.coordinate)];
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const project = (p: [number, number]) => [35 + (p[0] - minX) / (maxX - minX || 1) * 330, 190 - (p[1] - minY) / (maxY - minY || 1) * 150];
  const start = project(plan.geometry[0]), end = project(plan.geometry.at(-1)!);
  return <svg viewBox="0 0 400 230" className="route-sketch" role="img" aria-label="Schéma du trajet avec les arrêts numérotés">
    <rect width="400" height="230" fill="var(--map-bg)" rx="20" />
    {[60,120,180].map(y => <path key={y} d={`M0 ${y} Q150 ${y-60} 400 ${y+30}`} fill="none" stroke="var(--map-line)" strokeWidth="15" />)}
    <path d={plan.geometry.map((p,i) => `${i ? 'L' : 'M'}${project(p).join(' ')}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={start[0]} cy={start[1]} r="7" fill="var(--accent)" stroke="white" strokeWidth="3" />
    <circle cx={end[0]} cy={end[1]} r="7" fill="var(--accent)" stroke="white" strokeWidth="3" />
    {plan.stops.map((s,i) => { const p = project(s.coordinate); return <g key={s.id} onClick={() => onSelect?.(s.id)} style={{cursor: onSelect ? 'pointer' : 'default'}}><circle cx={p[0]} cy={p[1]} r={s.id === selected ? 16 : 13} fill="var(--accent)" stroke="white" strokeWidth="3" /><text x={p[0]} y={p[1]+5} textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{i+1}</text></g>; })}
    <text x="16" y="218" fill="var(--muted)" fontSize="10">Schéma indicatif · © OpenStreetMap contributors en mode réel</text>
  </svg>;
}
