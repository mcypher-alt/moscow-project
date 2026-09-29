export type Role = "DISPATCHER" | "ANALYST" | "ADMIN";

export type IncidentStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "CONFIRMED"
  | "FALSE_POSITIVE"
  | "RESOLVED";

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

export interface SystemObject {
  id: number;
  dispatcherName: string;
  name?: string;
  address?: string;
  description?: string;
  objectKind?: string;
  latitude?: number | null;
  longitude?: number | null;
  incidents?: Incident[];
  forecasts?: Forecast[];
  channels?: { id: number; sensorName: string; systemTag?: string; systemType?: string; sensorType?: string | null; events: { rawValue: string | null; numericValue: number | null; isAlarm: boolean; recordedAt: string }[] }[];
  workRequests?: { externalId: string; status: string; description: string }[];
}

export interface Incident {
  id: string;
  systemObjectId: number;
  systemObject?: SystemObject;

  channelId?: number | null;

  scenario: string;
  horizon: string;
  reason: string;
  probability?: number | null;
  modelVersion?: string | null;

  status: IncidentStatus;

  recommendation: string | null;

  createdAt: string;
  updatedAt: string;

  actions?: DispatcherAction[];
}

export interface DispatcherAction {
  reasonCode?: string | null;
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
  reasonCode?: string;
}

export interface HotAlert {
  id: string | number;

  systemObjectId: number;
  dispatcherName: string;

  scenario: string;
  horizon: string;
  reason: string;

  recommendation: string | null;

  createdAt?: string;
  probability?: number | null;
}

export interface Forecast {
  id: string;
  systemObjectId: number;
  systemObject?: SystemObject;
  evaluatedAt: string;
  probability: number;
  threshold: number;
  isIncidentPredicted: boolean;
  horizonHours: number;
  modelVersion: string;
  scenario: string;
  reason: string;
  recommendation: string;
}

export interface AlertResolvedEvent {
  id: string;
}
