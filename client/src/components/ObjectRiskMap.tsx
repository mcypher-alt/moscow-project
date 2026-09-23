import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
    useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useObjects } from '../hooks/useDispatcher';

type RiskLevel = 'normal' | 'warning' | 'critical';
type FilterOption = 'all' | RiskLevel;

interface MapObjectItem {
    id: number;
    name: string;
    kindLabel: string;
    lat: number;
    lng: number;
    risk: RiskLevel;
    incident?: string | null;
    horizon?: string | null;
}

interface RawObjectData {
    id: number;
    name: string;
    kindLabel?: string;
    objectKind?: string;
    activeIncident?: string | null;
    incident?: {
        scenario?: string;
        horizon?: string;
    } | null;
    horizon?: string | null;
    lat?: number;
    lng?: number;
}

const riskColors: Record<RiskLevel, string> = {
    normal: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
};

const riskLabels: Record<RiskLevel, string> = {
    normal: 'Штатно',
    warning: 'Повышенный риск',
    critical: 'Критический риск',
};

// Стабильные псевдослучайные координаты в границах Москвы по ID объекта
function getObjectCoordinates(id: number): [number, number] {
    const centerLat = 55.751244;
    const centerLng = 37.618423;
    const latOffset = (((id * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.12;
    const lngOffset = (((id * 49297 + 9301) % 233280) / 233280 - 0.5) * 0.22;
    return [centerLat + latOffset, centerLng + lngOffset];
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 150);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

export const ObjectRiskMap = memo(function ObjectRiskMap() {
    const navigate = useNavigate();
    const [selectedRisk, setSelectedRisk] = useState<FilterOption>('all');

    // 1. Тянем реальные данные из PostgreSQL
    const { data: rawObjects = [], isLoading } = useObjects();

    // 2. Преобразуем реальные объекты в формат карты
    const mapObjects: MapObjectItem[] = useMemo(() => {
        return rawObjects.map((obj: RawObjectData) => {
            const hasIncident = Boolean(obj.activeIncident || obj.incident);
            const risk: RiskLevel = hasIncident ? 'critical' : 'normal';
            const [lat, lng] = obj.lat && obj.lng 
                ? [obj.lat, obj.lng] 
                : getObjectCoordinates(obj.id);

            return {
                id: obj.id,
                name: obj.name,
                kindLabel: obj.kindLabel || obj.objectKind || 'Узел инфраструктуры',
                lat,
                lng,
                risk,
                incident: obj.activeIncident || obj.incident?.scenario || null,
                horizon: obj.horizon || obj.incident?.horizon || null,
            };
        });
    }, [rawObjects]);

    // 3. Фильтрация маркеров
    const filteredObjects = useMemo(() => {
        if (selectedRisk === 'all') return mapObjects;
        return mapObjects.filter((obj) => obj.risk === selectedRisk);
    }, [mapObjects, selectedRisk]);

    // 4. Подсчет счетчиков на кнопках
    const counts = useMemo(() => ({
        all: mapObjects.length,
        critical: mapObjects.filter((o) => o.risk === 'critical').length,
        warning: mapObjects.filter((o) => o.risk === 'warning').length,
        normal: mapObjects.filter((o) => o.risk === 'normal').length,
    }), [mapObjects]);

    if (isLoading) {
        return (
            <div className="flex h-[460px] items-center justify-center rounded-xl border bg-card">
                <p className="text-sm text-muted-foreground animate-pulse">
                    Синхронизация объектов на карте...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Панель фильтров над картой */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setSelectedRisk('all')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selectedRisk === 'all'
                            ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                            : 'bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                >
                    <span>Все объекты</span>
                    <span className="rounded-full bg-neutral-800 px-1.5 py-0.2 text-[10px] text-neutral-400">
                        {counts.all}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedRisk('critical')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selectedRisk === 'critical'
                            ? 'bg-red-950/80 text-red-200 ring-1 ring-red-500/50 shadow-sm'
                            : 'bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800 hover:text-red-300'
                    }`}
                >
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Критический</span>
                    <span className="rounded-full bg-red-900/50 px-1.5 py-0.2 text-[10px] text-red-300">
                        {counts.critical}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedRisk('warning')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selectedRisk === 'warning'
                            ? 'bg-amber-950/80 text-amber-200 ring-1 ring-amber-500/50 shadow-sm'
                            : 'bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800 hover:text-amber-300'
                    }`}
                >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Повышенный</span>
                    <span className="rounded-full bg-amber-900/50 px-1.5 py-0.2 text-[10px] text-amber-300">
                        {counts.warning}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedRisk('normal')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selectedRisk === 'normal'
                            ? 'bg-emerald-950/80 text-emerald-200 ring-1 ring-emerald-500/50 shadow-sm'
                            : 'bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800 hover:text-emerald-300'
                    }`}
                >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Штатно</span>
                    <span className="rounded-full bg-emerald-900/50 px-1.5 py-0.2 text-[10px] text-emerald-300">
                        {counts.normal}
                    </span>
                </button>
            </div>

            {/* Контейнер карты */}
            <div className="overflow-hidden rounded-xl border border-border isolate">
                <MapContainer
                    center={[55.751244, 37.618423]}
                    zoom={11}
                    scrollWheelZoom={false}
                    className="h-[420px] w-full bg-neutral-950"
                >
                    <MapResizer />

                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {filteredObjects.map((object) => {
                        const isCritical = object.risk === 'critical';
                        const color = riskColors[object.risk];

                        return (
                            <CircleMarker
                                key={object.id}
                                center={[object.lat, object.lng]}
                                radius={isCritical ? 11 : 8}
                                pathOptions={{
                                    color,
                                    fillColor: color,
                                    fillOpacity: 0.85,
                                    weight: isCritical ? 3 : 2,
                                }}
                            >
                                <Popup>
                                    <div className="min-w-[230px] space-y-2 p-1 text-neutral-900">
                                        <div className="border-b pb-1 font-semibold text-sm">
                                            {object.name}
                                            <span className="block text-xs font-normal text-neutral-500">
                                                {object.kindLabel} (#{object.id})
                                            </span>
                                        </div>

                                        <div className="text-xs">
                                            <span className="text-neutral-500">Статус: </span>
                                            <strong style={{ color }}>{riskLabels[object.risk]}</strong>
                                        </div>

                                        {object.incident && (
                                            <div className="rounded bg-neutral-100 p-2 text-xs space-y-1">
                                                <div>
                                                    <span className="text-neutral-500">Риск:</span>{' '}
                                                    <span className="font-medium text-red-600">{object.incident}</span>
                                                </div>
                                                {object.horizon && (
                                                    <div>
                                                        <span className="text-neutral-500">Горизонт:</span>{' '}
                                                        <span className="font-medium">{object.horizon}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => navigate(`/objects/${object.id}`)}
                                            className="w-full mt-1 rounded bg-neutral-900 py-1 text-center text-xs font-medium text-white hover:bg-neutral-800 transition"
                                        >
                                            Открыть паспорт объекта →
                                        </button>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
});