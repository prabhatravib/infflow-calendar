import type { ProtectedHexaBinding } from '../protectedHexa/routes';

export interface Env {
  DB: any; // D1Database type
  ASSETS: any; // Fetcher type
  USER_ID: string;
  OPENAI_API_KEY: string;
  HEXA_PROTECTED_CONTROL?: ProtectedHexaBinding;
  [key: string]: any; // Index signature for Hono compatibility
}

export interface Event {
  id: string;
  calendar_id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  tz: string;
  type?: string;
  flowchart?: string;
  echo_event_ids?: string;
  parent_event_id?: string;
  user_id?: string;
  eventType?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  calendar_id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  tz: string;
  eventType?: string;
  location?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  tz?: string;
  eventType?: string;
  location?: string;
}

export interface WeatherResponse {
  data: any;
  status: string;
}

export interface EchoResponse {
  mermaid: string;
  events: any[];
}
