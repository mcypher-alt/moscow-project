import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type RiskLevel = 'normal' | 'warning' | 'critical';

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

const objects: MapObject[] = [
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

export function ObjectRiskMap() {
    return (
        <div className="overflow-hidden rounded-xl border border-border">
            <MapContainer
                center={[55.7558, 37.6173]}
                zoom={11}
                scrollWheelZoom
                className="h-[420px] w-full"
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {objects.map((object) => (
                    <CircleMarker
                        key={object.id}
                        center={[object.lat, object.lng]}
                        radius={object.risk === 'critical' ? 12 : 9}
                        pathOptions={{
                            color: riskColors[object.risk],
                            fillColor: riskColors[object.risk],
                            fillOpacity: 0.8,
                            weight: 3,
                        }}
                    >
                        <Popup>
                            <div className="min-w-[220px] space-y-2">
                                <div>
                                    <strong>{object.name}</strong>
                                    <div>Объект #{object.id}</div>
                                </div>

                                <div>
                                    Статус: {riskLabels[object.risk]}
                                </div>

                                {object.incident && (
                                    <>
                                        <div>
                                            <strong>Прогноз:</strong>{' '}
                                            {object.incident}
                                        </div>

                                        <div>
                                            <strong>Горизонт:</strong>{' '}
                                            {object.horizon}
                                        </div>
                                    </>
                                )}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
}