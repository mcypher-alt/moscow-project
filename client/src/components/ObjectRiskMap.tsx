import { IncidentLink } from './IncidentLink';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, ZoomControl, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import { Link } from 'react-router';
import 'leaflet/dist/leaflet.css';
import { useObjects, objectRisk } from '../hooks/useObjects';
import { categoryLabels, equipmentCategories, hasCoordinates, matchesObject } from '../lib/mapObjects';
import type { SystemObject } from '../types';
type Located = SystemObject & { latitude: number; longitude: number };
type Risk = ReturnType<typeof objectRisk>;
const colors: Record<Risk, string> = { unknown: '#64748b', normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
const labels: Record<Risk, string> = { unknown: 'Нет актуального прогноза', normal: 'Зелёный — ниже порога модели', warning: 'Жёлтый — повышенный риск', critical: 'Красный — требует проверки' };
function ObjectMarker({ object, selected = false }: { object: Located; selected?: boolean }) {
 const forecast = object.forecasts?.[0]; const risk = objectRisk(object);
 return <CircleMarker center={[object.latitude, object.longitude]} radius={selected ? 15 : 8} pathOptions={{ color: selected ? '#2563eb' : colors[risk], fillColor: colors[risk], fillOpacity: .85, weight: selected ? 5 : 2 }}>
  <Popup><div className="min-w-56 space-y-2"><strong>{object.dispatcherName}</strong><p>Объект #{object.id}</p><p>{object.address || 'Адрес не предоставлен'}</p><p>{labels[risk]} {forecast && `(${forecast.probability.toFixed(1)}%)`}</p>
  {forecast && <p>Горизонт: {forecast.horizonHours} ч.<br/>Данные: {new Date(forecast.evaluatedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК</p>}
  <IncidentLink object={object} /><br/><Link className="underline font-semibold" to={`/objects/${object.id}`}>Подробнее об объекте</Link></div></Popup>
  {selected && <Tooltip permanent direction="top">Выбран: {object.dispatcherName}</Tooltip>}
 </CircleMarker>;
}
function MapLayers({ objects, selected, mode, selectionKey }: { objects: Located[]; selected?: Located; mode: string; selectionKey: number }) {
 const map = useMap(); const [, redraw] = useState(0);
 useMapEvents({ moveend: () => redraw(v => v + 1), zoomend: () => redraw(v => v + 1), resize: () => redraw(v => v + 1) });
 const lat = selected?.latitude, lng = selected?.longitude;
 useEffect(() => { if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: false }); }, [map, lat, lng, selectionKey]);
 useEffect(() => {
  if (mode !== 'heat') return;
  const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:450';
  canvas.setAttribute('aria-hidden', 'true'); map.getContainer().append(canvas);
  const draw = () => {
   const size = map.getSize(); canvas.width = size.x; canvas.height = size.y;
   const ctx = canvas.getContext('2d'); if (!ctx) return;
   for (const object of objects) {
    if (objectRisk(object) === 'unknown') continue;
    const p = map.latLngToContainerPoint([object.latitude, object.longitude]);
    if (p.x < -40 || p.y < -40 || p.x > size.x + 40 || p.y > size.y + 40) continue;
    const intensity = (object.forecasts?.[0]?.probability ?? 0) / 100;
    if (intensity <= 0) continue;
    const gradient = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,35);
    gradient.addColorStop(0, `rgba(0,0,0,${intensity * .7})`); gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(p.x-35,p.y-35,70,70);
   }
   const pixels = ctx.getImageData(0,0,size.x,size.y);
   for (let i=0; i<pixels.data.length; i+=4) { const a=pixels.data[i+3]/255; pixels.data[i]=Math.min(255,a*510); pixels.data[i+1]=Math.min(255,(1-a)*510); pixels.data[i+2]=30; }
   ctx.putImageData(pixels,0,0);
  };
  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  draw(); map.on('move zoom resize', schedule);
  return () => { cancelAnimationFrame(frame); map.off('move zoom resize', schedule); canvas.remove(); };
 }, [map, objects, mode]);
 const bins = new Map<string, Located[]>();
 const bounds = map.getBounds().pad(.1);
 for (const object of objects) {
  if (object.id === selected?.id || !bounds.contains([object.latitude, object.longitude])) continue;
  const p = map.project([object.latitude, object.longitude]);
  const key = `${Math.floor(p.x/55)}:${Math.floor(p.y/55)}`;
  const bin = bins.get(key) ?? []; bin.push(object); bins.set(key,bin);
 }
 return <>
  {mode === 'points' && [...bins].map(([key, bin]) => {
   if (bin.length === 1) return <ObjectMarker key={bin[0].id} object={bin[0]} />;
   const rank: Risk[] = ['unknown','normal','warning','critical'];
   const risk = rank[bin.reduce((max,v) => Math.max(max,rank.indexOf(objectRisk(v))),0)];
   const center: [number,number] = [bin.reduce((sum,v)=>sum+v.latitude,0)/bin.length,bin.reduce((sum,v)=>sum+v.longitude,0)/bin.length];
   return <CircleMarker key={key} center={center} radius={18} pathOptions={{ color: colors[risk], fillColor: colors[risk], fillOpacity: .75 }} eventHandlers={{ click: () => map.fitBounds(latLngBounds(bin.map(v => [v.latitude,v.longitude])), { maxZoom: 18 }) }}>
    <Tooltip permanent direction="center">{bin.length}</Tooltip><Popup><p>Группа: {bin.length}. Увеличьте карту или выберите объект в поиске.</p>{bin.slice(0,20).map(v => <p key={v.id}><Link to={`/objects/${v.id}`}>{v.dispatcherName} (#{v.id})</Link></p>)}</Popup>
   </CircleMarker>;
  })}
  {selected && <ObjectMarker key={`selected-${selected.id}`} object={selected} selected />}
 </>;
}
export function ObjectRiskMap() {
 const query = useObjects(); const [search,setSearch] = useState(''); const [risk,setRisk] = useState('all'); const [category,setCategory] = useState('all'); const [type,setType] = useState('all'); const [mode,setMode] = useState('points'); const [selectedId,setSelectedId] = useState<number>();
 const [selectionKey, setSelectionKey] = useState(0);
 const all = useMemo(() => query.data ?? [], [query.data]);
 const types = useMemo(() => [...new Set(all.flatMap(v => (v.channels ?? []).flatMap(c => [c.systemType,c.sensorType].filter((s): s is string => !!s))))].sort(), [all]);
 const filtered = useMemo(() => all.filter(v => (risk === 'all' || objectRisk(v, query.dataUpdatedAt) === risk) && (category === 'all' || equipmentCategories(v).includes(category as keyof typeof categoryLabels)) && (type === 'all' || v.channels?.some(c => c.systemType === type || c.sensorType === type))), [all,risk,category,type,query.dataUpdatedAt]);
 const results = useMemo(() => search.trim() ? filtered.filter(v => matchesObject(v,search)) : filtered, [filtered,search]);
 const located = useMemo(() => filtered.filter(hasCoordinates), [filtered]);
 const selected = located.find(v => v.id === selectedId);
 return <div className="overflow-hidden rounded-xl border border-border">
  <div className="p-3 space-y-3"><div className="flex flex-wrap gap-3">
   <label>Режим <select className="border rounded p-2" value={mode} onChange={e=>setMode(e.target.value)}><option value="points">Точки и группы</option><option value="heat">Тепловая карта</option></select></label>
   <label>Риск <select className="border rounded p-2" value={risk} onChange={e=>setRisk(e.target.value)}><option value="all">Все статусы</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label>Категория <select className="border rounded p-2" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Все категории</option>{Object.entries(categoryLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label>Тип системы / датчика <select className="border rounded p-2 max-w-64" value={type} onChange={e=>setType(e.target.value)}><option value="all">Все типы</option>{types.map(v=><option key={v}>{v}</option>)}</select></label>
  </div>
  <label className="block">Поиск объекта<input className="border rounded p-2 w-full mt-1" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ID, название, тег, адрес, тип системы / оборудования" /></label>
  {search.trim() && <div className="max-h-52 overflow-y-auto" role="region" aria-label="Результаты поиска"><p>Найдено: {results.length}{results.length>50 ? ' (первые 50; уточните запрос)' : ''}</p>{results.slice(0,50).map(v=><div key={v.id} className="border-b p-2 flex gap-3 items-center"><button className="text-left underline" disabled={!hasCoordinates(v)} onClick={()=>{setSelectedId(v.id);setSelectionKey(n=>n+1);}}>{v.dispatcherName} (#{v.id})</button>{!hasCoordinates(v) && <span>Координаты отсутствуют</span>}<Link className="underline" to={`/objects/${v.id}`}>Подробнее об объекте</Link></div>)}</div>}
  {query.isLoading && <p role="status">Загрузка карты…</p>}{query.isError && <p role="alert">Не удалось загрузить объекты.</p>}
  <p className="text-sm" role="status">По фильтрам: {filtered.length}. На карте: {located.length}. Без координат: {filtered.length-located.length}.</p>
  <p className="text-xs text-muted-foreground">Красный: актуальный прогноз и незакрытое предупреждение. Жёлтый: выше порога модели. Зелёный: ниже порога. Серый: нет актуальных данных. Это приоритет проверки, а не подтверждённая тяжесть аварии.</p>
  {mode === 'heat' && <p className="text-sm">Тепловая карта: плотность объектов с весом по вероятности (зелёный → жёлтый → красный). Цвет области не является вероятностью аварии. Устаревшие прогнозы исключены. Выберите объект через поиск или режим точек.</p>}
  {selected && <p role="status">Выбран: {selected.dispatcherName} (#{selected.id}) · <IncidentLink object={selected} /> · <Link className="underline" to={`/objects/${selected.id}`}>Подробнее об объекте</Link></p>}
  </div>
  <MapContainer center={[55.7558,37.6173]} zoom={11} zoomControl={false} scrollWheelZoom preferCanvas className="isolate z-0 h-[520px] w-full">
   <ZoomControl zoomInTitle="Увеличить" zoomOutTitle="Уменьшить" />
  <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
   <MapLayers objects={located} selected={selected} mode={mode} selectionKey={selectionKey} />
  </MapContainer>
 </div>;
}
