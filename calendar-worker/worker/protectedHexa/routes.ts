import { Hono } from 'hono';
import { buildCalendarContext } from './calendarContext';
import type { Env } from '../types';

export const CALENDAR_PARENT_ORIGIN = 'https://infflow-calendar.prabhatravib.workers.dev';
const ID = /^[a-f0-9]{64}$/;
export interface CalendarGrant {
  id: string; capability: string; mode: 'normal'; expiresAt: number; parentOrigin: string;
}
export interface CalendarContextReceipt { ready: true; contextRevision: number; contextSha256: string }
export interface ProtectedHexaBinding {
  createSession(mode: 'normal', parentOrigin: string, expectedProfile: 'calendar'): Promise<CalendarGrant>;
  setContext(id: string, capability: string, context: string): Promise<CalendarContextReceipt>;
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
});
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
async function boundedBody(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '') ||
      Number(request.headers.get('Content-Length')) > 200000 || !request.body) throw new Error('invalid_request');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel(); }, 5000);
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 200000) { await reader.cancel(); throw new Error('invalid_request'); }
      chunks.push(part.value);
    }
  } finally { clearTimeout(timer); }
  if (timedOut) throw new Error('invalid_request');
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!record(value)) throw new Error('invalid_request');
  return value;
}
// Registered before the legacy public-CORS middleware; these routes have their
// own exact origin checks, no CORS grant, and never expose private RPC errors.
export const protectedHexaRouter = new Hono<{ Bindings: Env }>();
protectedHexaRouter.all('/api/hexa/*', async c => {
  const request = c.req.raw;
  if (new URL(request.url).origin !== CALENDAR_PARENT_ORIGIN || request.headers.get('Origin') !== CALENDAR_PARENT_ORIGIN) {
    return response({ error: 'origin_forbidden' }, 403);
  }
  if (!['/api/hexa/session', '/api/hexa/context'].includes(c.req.path)) return response({ error: 'not_found' }, 404);
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
  let value: Record<string, unknown>;
  try {
    value = await boundedBody(request);
    if (c.req.path === '/api/hexa/session') {
      if (Object.keys(value).length !== 0) return response({ error: 'invalid_request' }, 400);
    } else {
      const capability = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') ?? '')?.[1];
      if (!capability || typeof value.sessionId !== 'string' || !ID.test(value.sessionId)) return response({ error: 'forbidden' }, 403);
      if (Object.keys(value).sort().join(',') !== 'calendar,sessionId') return response({ error: 'invalid_request' }, 400);
      buildCalendarContext(value.calendar);
    }
  } catch { return response({ error: 'invalid_request' }, 400); }
  // shared-protected-voice/1 setContext authenticates only id + capability. It
  // cannot atomically constrain the existing session's profile, mode and parent
  // origin. Do not expose a write proxy for another app's bearer pair, issue an
  // unusable grant, invent a future RPC or install an isolate-local registry.
  // The shared coordinator must seal that missing ownership contract first.
  return response({ error: 'calendar_context_contract_unavailable' }, 503);
});
