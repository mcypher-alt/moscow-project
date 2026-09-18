export type Role = 'DISPATCHER' | 'ANALYST' | 'ADMIN';

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// Пользователь (как возвращает /auth/login и /auth/me)
export interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    createdAt?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

// Данные объекта телеметрии
export interface SystemObject {
    id: number;
    name: string;
    address?: string;
    description?: string;
}

// Запись инцидента в PostgreSQL (/api/incidents)
export interface Incident {
    id: string;
    systemObjectId: number;
    systemObject?: SystemObject;
    dispatcherName: string;
    scenario: string;
    probability: number;
    status: IncidentStatus;
    recommendation: string | null;
    triggerFactors: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

// Ответ на фиксацию действия (/api/incidents/:id/action)
export interface DispatcherAction {
    id: string;
    incidentId: string;
    userId: string;
    decision: string;
    comment?: string | null;
    createdAt: string;
}

export interface RecordActionPayload {
    decision: string;
    comment?: string;
    timestamp: string;
}

// Горячий алерт из Redis (/api/alerts/hot и стрим SSE)
export interface HotAlert {
    id: string | number;
    systemObjectId: number;
    dispatcherName: string;
    scenario: string;
    probability: number;
    recommendation: string | null;
    triggerFactors: Record<string, unknown>;
}

// Данные события снятия алерта из SSE
export interface AlertResolvedEvent {
    id: string;
}