export type Role = "DISPATCHER" | "ANALYST" | "ADMIN";

export type IncidentStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "CONFIRMED"
  | "FALSE_POSITIVE";

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
}

export interface Incident {
  id: string;
  systemObjectId: number;
  systemObject?: SystemObject;

  channelId?: number | null;

  scenario: string;
  horizon: string;
  reason: string;

  status: IncidentStatus;

  recommendation: string | null;

  createdAt: string;
  updatedAt: string;

  actions?: DispatcherAction[];
}

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
  status?: 'OPEN' | 'IN_PROGRESS' | 'CONFIRMED' | 'FALSE_POSITIVE' | string;
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
}

export interface AlertResolvedEvent {
  id: string;
}

// src/types/index.ts (или src/types.ts)

export interface ObjectSensorItem {
  id: number;
  systemTag: string;
  name: string;
  systemType: string;
  sensorType: string | null;
}

export interface ObjectActiveIncident {
  id: string;
  scenario: string;
  horizon: string;
  reason: string;
  recommendation: string | null;
}

export interface ObjectParentNode {
  id: number;
  name: string;
}

export interface SystemObjectDetails {
  id: number;
  name: string;
  level: number;
  objectKind: string;
  kindLabel: string;
  parent: ObjectParentNode | null;
  childrenCount: number;
  status: 'CRITICAL' | 'NORMAL';
  incident: ObjectActiveIncident | null;
  sensors: ObjectSensorItem[];
}