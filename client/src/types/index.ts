export type Role = 'DISPATCHER' | 'ANALYST' | 'ADMIN';

// Статусы инцидента под требование долгосрочной верификации прогноза
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'CONFIRMED' | 'FALSE_POSITIVE';

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
    dispatcherName: string;
    name?: string;
    address?: string;
    description?: string;
}

// Запись инцидента в PostgreSQL (/api/incidents)
export interface Incident {
    id: string;
    systemObjectId: number;
    systemObject?: SystemObject;
    channelId?: number | null;
    scenario: string;               // Тип аварии/угрозы
    horizon: string;                // Временной горизонт ("24-48 часов", "2-4 часа")
    reason: string;                 // Физическая причина / триггер
    status: IncidentStatus;
    recommendation: string | null;  // Инструкция для диспетчера
    createdAt: string;
    updatedAt: string;
    actions?: DispatcherAction[];
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
    timestamp?: string;
}

// Горячий алерт из Redis (/api/alerts/hot и стрим SSE)
export interface HotAlert {
    id: string | number;
    systemObjectId: number;
    dispatcherName: string;
    scenario: string;               // Что сломается
    horizon: string;                // Срок наступления
    reason: string;                 // Почему сработало
    recommendation: string | null;
    createdAt?: string;
}

// Данные события снятия алерта из SSE
export interface AlertResolvedEvent {
    id: string;
}