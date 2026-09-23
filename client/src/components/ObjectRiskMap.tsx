import { memo, useEffect, useMemo, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
    useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type RiskLevel = 'normal' | 'warning' | 'critical';
type FilterOption = 'all' | RiskLevel;

interface MapObject {
    id: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
    risk: RiskLevel;
    incident?: string;
    horizon?: string;
}

const OBJECTS: MapObject[] = [
    {
        id: 5122,
        name: 'ДУ объект Альфа',
        address: 'Инженерный коллектор №5122',
        lat: 55.7558,
        lng: 37.6173,
        risk: 'critical',
        incident: 'Перегрев подшипника насоса',
        horizon: '24–48 часов',
    },
    {
        id: 3814,
        name: 'Коллектор №3814',
        address: 'Кабельный отсек',
        lat: 55.766,
        lng: 37.59,
        risk: 'warning',
        incident: 'Повышенный пожарный риск',
        horizon: '24 часа',
    },
    {
        id: 4201,
        name: 'Коллектор №4201',
        address: 'Насосная станция',
        lat: 55.742,
        lng: 37.64,
        risk: 'normal',
    },
    {
        id: 2760,
        name: 'Коллектор №2760',
        address: 'Вентиляционная шахта',
        lat: 55.78,
        lng: 37.63,
        risk: 'normal',
    },
];

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
    const [selectedRisk, setSelectedRisk] = useState<FilterOption>('all');

    // Фильтрация объектов по выбранной кнопке
    const filteredObjects = useMemo(() => {
        if (selectedRisk === 'all') return OBJECTS;
        return OBJECTS.filter((obj) => obj.risk === selectedRisk);
    }, [selectedRisk]);

    // Подсчет объектов по группам для бейджей на кнопках
    const counts = useMemo(() => ({
        all: OBJECTS.length,
        critical: OBJECTS.filter((o) => o.risk === 'critical').length,
        warning: OBJECTS.filter((o) => o.risk === 'warning').length,
        normal: OBJECTS.filter((o) => o.risk === 'normal').length,
    }), []);

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
                    center={[55.7558, 37.6173]}
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
                                    <div className="min-w-[220px] space-y-1.5 p-1 text-neutral-900">
                                        <div className="border-b pb-1 font-semibold text-sm">
                                            {object.name}
                                            <span className="block text-xs font-normal text-neutral-500">
                                                {object.address} (#{object.id})
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
                                                <div>
                                                    <span className="text-neutral-500">Горизонт:</span>{' '}
                                                    <span className="font-medium">{object.horizon}</span>
                                                </div>
                                            </div>
                                        )}
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