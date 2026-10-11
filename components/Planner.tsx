'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toBlob } from 'html-to-image';
import { ArrowDown, ArrowRight, Battery, Check, ChevronRight, Clock3, Download, Leaf, LoaderCircle, MapPin, Moon, Pencil, RotateCw, Share2, Sun, X, Zap } from 'lucide-react';
import { defaultInput, Input, Plan, vehicles } from '@/lib/types';
import { demo } from '@/lib/planner';
import RouteSketch from './RouteSketch';
const TripMap = dynamic(() => import('./TripMap'), { ssr:false, loading:() => <div className="map-loading">Chargement de la carte…</div> });
const rounded = (v:number) => Math.round(v);
const money = (v:number) => v.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const duration = (v:number) => { const m = Math.round(v); return `${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')}`; };
const time = (plan:Plan, minutes=0) => new Date(new Date(plan.input.departure).getTime()+minutes*60000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const date = (s:string) => new Date(s).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});

export default function Planner() {
  const [input,setInput] = useState<Input | null>(null);
  const [plan,setPlan] = useState<Plan | null>(null);
  const [edit,setEdit] = useState(false), [compact,setCompact] = useState(false), [dark,setDark] = useState(false);
  const [busy,setBusy] = useState(false), [sharing,setSharing] = useState(false), [saved,setSaved] = useState(false);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [selected,setSelected] = useState<string>();
  const [exportFile,setExportFile] = useState<File | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const version = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const value=defaultInput(); setInput(value); setPlan(demo(value)); const theme=localStorage.getItem('evtrip-theme'); setDark(theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches)); },[]);
  useEffect(() => { document.documentElement.dataset.theme=dark?'dark':'light'; },[dark]);
  useEffect(() => { if (!edit) return; closeRef.current?.focus(); const listener=(e:KeyboardEvent) => { if(e.key==='Escape') setEdit(false); }; document.addEventListener('keydown',listener); return () => document.removeEventListener('keydown',listener); },[edit]);
  useEffect(() => () => abortRef.current?.abort(),[]);
  async function calculate(value:Input) {
    abortRef.current?.abort(); const controller=new AbortController(); abortRef.current=controller;
    const request=++version.current; setBusy(true); setError(''); setNotice(''); setExportFile(null);
    try {
      const response=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:controller.signal});
      const result=await response.json(); if(!response.ok) throw new Error(result.error || 'Calcul impossible.');
      if(request !== version.current) return;
      setPlan(result); setInput(value); setEdit(false); setSaved(false); setSelected(undefined);
    } catch(e) { if(e instanceof Error && e.name !== 'AbortError' && request === version.current) setError(e.message); }
    finally { if(request === version.current) setBusy(false); }
  }
  function choose(id:string) { setSelected(id); document.getElementById(`stop-${id}`)?.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  function save() { if(!plan) return; try { localStorage.setItem('evtrip-saved',JSON.stringify(plan.input)); setSaved(true); setNotice('Trajet enregistré sur cet appareil.'); } catch { setError('Le stockage local est indisponible.'); } }
  function restore() { try { const data=localStorage.getItem('evtrip-saved'); if(!data) {setNotice('Aucun trajet enregistré sur cet appareil.');return;} void calculate(JSON.parse(data)); } catch {setError('Impossible de restaurer ce trajet.');} }
  function download(file:File) { const url=URL.createObjectURL(file); const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(() => URL.revokeObjectURL(url),30000); }
  async function nativeShare(file:File) { try { if(navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:'Mon voyage électrique'}); else {download(file);setNotice('Image téléchargée. Vous pouvez la partager depuis vos fichiers.');} } catch(e) { if(e instanceof Error && e.name !== 'AbortError') setError('Partage indisponible. Utilisez Télécharger le PNG.'); } }
  async function share() {
    if(!exportRef.current || !plan) return; setSharing(true);setError('');
    try {
      await document.fonts.ready;
      const blob=await toBlob(exportRef.current,{pixelRatio:2,backgroundColor:dark?'#10221e':'#f4f5ef',cacheBust:true});
      if(!blob) throw new Error('Impossible de générer l’image.');
      const file=new File([blob],'evtrip-recapitulatif.png',{type:'image/png'}); setExportFile(file);
      // iOS may expire transient activation while rendering; a second explicit tap is provided.
      if(navigator.userActivation?.isActive) await nativeShare(file);
      else setNotice('Votre image est prête. Touchez « Partager le PNG » pour ouvrir le partage iPhone.');
    } catch(e) {setError(e instanceof Error?e.message:'Export impossible.');} finally {setSharing(false);}
  }
  if(!plan || !input) return <main className="initial-loading"><Zap/> Préparation de votre voyage…</main>;
  const change=<K extends keyof Input>(key:K,value:Input[K]) => {setInput({...input,[key]:value});setError('');};
  const stats = <div className="stats"><div><span>Distance</span><strong>{rounded(plan.distance)} <small>km</small></strong></div><div><span>Durée totale</span><strong>{duration(plan.totalMinutes)}</strong></div><div><span>Arrivée estimée</span><strong>{time(plan,plan.totalMinutes)}</strong></div><div><span>Recharges</span><strong>{plan.stops.length} <small>arrêt{plan.stops.length>1?'s':''}</small></strong></div></div>;
  const recap=<>
    <div className="eyebrow"><Zap size={14}/> EV TRIP · VOTRE VOYAGE ÉLECTRIQUE</div>
    <h2>{plan.origin.split(',')[0]} <ArrowRight size={23}/> {plan.destination.split(',')[0]}</h2>
    <p className="recap-date">{date(plan.input.departure)} · Départ {time(plan)} · {plan.vehicle.name}</p>
    {plan.input.mode==='demo' && <p className="demo-banner">DÉMONSTRATION · DONNÉES FICTIVES</p>}
    {stats}<RouteSketch plan={plan}/>
    <div className="compact-stops">{plan.stops.length===0 && <p>Aucune recharge nécessaire selon cette estimation.</p>}{plan.stops.map((s,i) => <div key={s.id}><b className="stop-number">{i+1}</b><div><strong>{s.name}</strong><span>{time(plan,s.arrivalMinutes)} · {s.minutes} min · {rounded(s.arrivalBattery)} % → {rounded(s.targetBattery)} %</span></div><Zap size={18}/></div>)}</div>
    <div className="recap-footer"><div><span>Recharges estimées</span><strong>{money(plan.cost)}</strong></div><div><span>Batterie à l’arrivée</span><strong>{rounded(plan.finalBattery)} %</strong></div></div>
    <p className="fine-print">{plan.chargingMinutes} min de recharge · Tarif supposé {plan.input.price.toFixed(2)} €/kWh · Coût des recharges uniquement, hors énergie initiale et péages.</p>
    <p className="fine-print">Calcul : {new Date(plan.calculatedAt).toLocaleString('fr-FR')} · Disponibilité inconnue, non vérifiée en temps réel. Batterie et durées estimées, sans trafic ni météo. {plan.input.mode==='live'?'Détours approximatifs à vol d’oiseau.':''}</p>
    <p className="fine-print">{plan.attribution}</p>
  </>;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="EV Trip accueil"><span><Zap size={21}/></span>ev<span className="brand-light">trip</span><i>PLANIFIER · RECHARGER · PARTAGER</i></a><div><button className="icon-button" onClick={() => {setDark(!dark);localStorage.setItem('evtrip-theme',String(!dark?'dark':'light'));}} aria-label={dark?'Activer le mode clair':'Activer le mode sombre'}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><button className="text-button" onClick={restore}>Mes trajets</button></div></header>
    <main>
      <div className="intro"><span className="eyebrow"><Leaf size={14}/> LA ROUTE, L’ESPRIT TRANQUILLE</span><h1>Le voyage commence ici.</h1><p>Votre itinéraire. Vos recharges. Tout, en un coup d’œil.</p></div>
      <div className="trip-header card"><div className="addresses"><span className="route-dots"><i/><em/><i/></span><div><span>Départ</span><strong>{plan.origin}</strong><span>Destination</span><strong>{plan.destination}</strong></div><button className="icon-button" onClick={() => setEdit(true)} aria-label="Modifier le trajet"><Pencil size={18}/></button></div><div className="trip-meta"><span><Zap size={14}/>{plan.vehicle.name}</span><span><Clock3 size={14}/>{time(plan)} · {date(plan.input.departure)}</span><span><Battery size={16}/>{plan.input.battery} % au départ</span></div></div>
      {plan.input.mode==='demo' && <div className="demo-banner">Exemple fictif Sauverny → Nice. <button onClick={() => {change('mode','live');setEdit(true);}}>Calculer mon trajet réel <ArrowRight size={14}/></button></div>}
      <div className="view-heading"><h2>Votre voyage <span>{plan.input.mode==='demo'?'Exemple':'Estimation'}</span></h2><div className="segmented"><button aria-pressed={!compact} onClick={() => setCompact(false)}>Détaillée</button><button aria-pressed={compact} onClick={() => setCompact(true)}>Compacte</button></div></div>
      <div aria-live="polite">{busy && <div className="notice"><LoaderCircle className="spin" size={17}/> Calcul du trajet et recherche des bornes…</div>}{error && <div role="alert" className="error">{error}</div>}{notice && <div className="notice">{notice}</div>}</div>
      {compact ? <section className="recap card">{recap}</section> : <>
        <section className="summary card">{stats}<div className="summary-bottom"><span><Zap size={17}/>{plan.chargingMinutes} min aux bornes</span><span><Battery size={17}/>{rounded(plan.finalBattery)} % à l’arrivée</span><strong>{money(plan.cost)} <small>de recharges estimées</small></strong></div></section>
        <div className="detail-grid"><section className="map-section card"><div className="section-title"><h2><MapPin size={18}/> L’itinéraire</h2><span>{rounded(plan.distance)} km</span></div><TripMap plan={plan} selected={selected} onSelect={choose}/><p className="map-caption">Touchez une borne pour retrouver son étape.</p></section>
        <section className="timeline card"><div className="section-title"><h2>Au fil du voyage</h2><span>{plan.stops.length} recharges</span></div><div className="timeline-point endpoint"><span className="timeline-icon"><MapPin size={16}/></span><div><span className="time">{time(plan)}</span><h3>{plan.origin.split(',')[0]}</h3><p>Départ · Batterie {plan.input.battery} %</p></div></div>
        {plan.stops.map((s,i) => <div key={s.id}>
          <div className="drive-leg"><span/><p>{rounded(s.progress-(i?plan.stops[i-1].progress:0))} km sur le trajet principal · ≈ {duration(s.arrivalMinutes-(i?plan.stops[i-1].arrivalMinutes+plan.stops[i-1].minutes:0))}</p></div>
          <article id={`stop-${s.id}`} className={`timeline-point charge-point ${selected===s.id?'selected':''}`}><button className="timeline-icon" onClick={() => choose(s.id)} aria-label={`Voir la borne ${i+1} sur la carte`}>{i+1}</button><div className="charge-body"><div className="charge-top"><span className="time">{time(plan,s.arrivalMinutes)}</span><span className="network">{s.network}</span></div><button className="station-name" onClick={() => choose(s.id)}>{s.name}<ChevronRight size={15}/></button><div className="charge-metrics"><span><Battery size={15}/>{rounded(s.arrivalBattery)} % <ArrowRight size={13}/> {rounded(s.targetBattery)} %</span><strong>{s.minutes} min</strong><span>{money(s.cost)}</span></div><div className="charge-bottom"><span>CCS · {s.power} kW · Disponibilité inconnue</span><button disabled={busy} onClick={() => void calculate({...plan.input,excluded:[...plan.input.excluded,s.id]})}>Exclure</button></div></div></article>
        </div>)}
        <div className="drive-leg"><span/><p>{rounded(plan.distance-plan.stops.reduce((sum,s)=>sum+2*s.offset,0)-(plan.stops.at(-1)?.progress??0))} km · ≈ {duration(plan.totalMinutes-(plan.stops.length?plan.stops.at(-1)!.arrivalMinutes+plan.stops.at(-1)!.minutes:0))}</p></div>
        <div className="timeline-point endpoint"><span className="timeline-icon arrival"><Check size={16}/></span><div><span className="time">{time(plan,plan.totalMinutes)}</span><h3>{plan.destination.split(',')[0]}</h3><p>Arrivée · Batterie estimée {rounded(plan.finalBattery)} %</p></div></div>
        </section></div>
      </>}
      <div className="actions"><button className="secondary" onClick={() => setEdit(true)}><Pencil size={17}/> Modifier</button><button className="secondary" disabled={busy} onClick={() => void calculate(plan.input)}><RotateCw size={17}/> Recalculer</button><button className="secondary" onClick={save}>{saved?<Check size={17}/>:<Download size={17}/>} {saved?'Enregistré':'Enregistrer'}</button><button className="primary" disabled={sharing || busy} onClick={() => void share()}>{sharing?<LoaderCircle size={17} className="spin"/>:<Share2 size={17}/>} Partager mon trajet</button></div>
      {exportFile && <div className="export-ready card"><span><Check size={18}/> Image PNG complète prête</span><button className="primary" onClick={() => void nativeShare(exportFile)}>Partager le PNG</button><button className="secondary" onClick={() => download(exportFile)}>Télécharger le PNG</button></div>}
      <aside className="disclaimer"><strong>Un voyage préparé, des estimations transparentes.</strong>{plan.warnings.map(w => <p key={w}>{w}</p>)}<p>Tarif supposé : {plan.input.price.toFixed(2)} €/kWh. Le coût inclut les recharges en route, hors batterie initiale, péages et frais annexes. Caractéristiques véhicule indicatives.</p><p>Calculé le {new Date(plan.calculatedAt).toLocaleString('fr-FR')} · Disponibilité des bornes : inconnue, non vérifiée en temps réel.</p><p>{plan.attribution} · Pas de navigation ni de garantie d’autonomie.</p></aside>
      <footer className="footer"><span>evtrip</span><span>Moins d’incertitude. Plus de voyage.</span></footer>
    </main>
    <div className="export-container" aria-hidden="true"><div ref={exportRef} className="recap export-card">{recap}</div></div>
    {edit && <div className="modal-backdrop" onClick={e => {if(e.target===e.currentTarget && !busy) setEdit(false);}}><section className="edit-panel" role="dialog" aria-modal="true" aria-labelledby="edit-title" onKeyDown={e => {if(e.key!=='Tab')return;const nodes=e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, select'); const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}><div className="section-title"><h2 id="edit-title">Préparons votre voyage</h2><button ref={closeRef} className="icon-button" aria-label="Fermer" onClick={() => setEdit(false)}><X/></button></div>
      <form onSubmit={e => {e.preventDefault();void calculate({...input,excluded:[]});}}>
        <label>Mode de calcul<select value={input.mode} onChange={e => change('mode',e.target.value as Input['mode'])}><option value="demo">Démonstration · trajet fictif Sauverny → Nice</option><option value="live">Trajet réel · estimation expérimentale</option></select></label>
        <label>Adresse de départ<input required maxLength={180} disabled={input.mode==='demo'} value={input.origin} onChange={e => change('origin',e.target.value)} placeholder="Ville, pays" autoComplete="off"/></label>
        <label>Destination<input required maxLength={180} disabled={input.mode==='demo'} value={input.destination} onChange={e => change('destination',e.target.value)} placeholder="Ville, pays" autoComplete="off"/></label>
        <label>Véhicule<select value={input.vehicleId} onChange={e => change('vehicleId',e.target.value)}>{vehicles.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}</select></label>
        <label>Date et heure de départ<input type="datetime-local" required value={input.departure} onChange={e => change('departure',e.target.value)}/></label>
        <div className="form-row"><label>Batterie initiale (%)<input required type="number" min={input.reserve+1} max="100" value={input.battery} onChange={e => change('battery',Number(e.target.value))}/></label><label>Réserve minimale (%)<input required type="number" min="5" max="30" value={input.reserve} onChange={e => change('reserve',Number(e.target.value))}/></label></div>
        <label>Tarif estimé des recharges (€/kWh)<input required type="number" min="0" max="3" step="0.01" value={input.price} onChange={e => change('price',Number(e.target.value))}/></label>
        <p className="fine-print">Les adresses du mode réel sont envoyées aux services Photon et OSRM. La disponibilité n’est pas connue. Aucun GPS ni compte nécessaire.</p>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="primary full-width" disabled={busy} type="submit">{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {busy?'Calcul en cours…':'Calculer le voyage'}</button>
      </form>
    </section></div>}
  </div>;
}
