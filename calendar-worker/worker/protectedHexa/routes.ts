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
  setContextForOwner(id: string, capability: string, context: string, expected: {
    profile: 'calendar'; mode: 'normal'; parentOrigin: string;
  }): Promise<CalendarContextReceipt>;
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
});
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function grantResult(value: unknown, serverNow: number): CalendarGrant {
  if (!record(value) || Object.keys(value).sort().join(',') !== 'capability,expiresAt,id,mode,parentOrigin' ||
      typeof value.id !== 'string' || !ID.test(value.id) || typeof value.capability !== 'string' || !ID.test(value.capability) ||
      value.mode !== 'normal' || value.parentOrigin !== CALENDAR_PARENT_ORIGIN ||
      typeof value.expiresAt !== 'number' || !Number.isSafeInteger(value.expiresAt) ||
      value.expiresAt <= serverNow || value.expiresAt > serverNow + 7_200_000) throw new Error('invalid_grant');
  return { id: value.id, capability: value.capability, mode: 'normal', expiresAt: value.expiresAt, parentOrigin: CALENDAR_PARENT_ORIGIN };
}
function storedResult(value: unknown, expectedHash: string): CalendarContextReceipt {
  if (!record(value) || Object.keys(value).sort().join(',') !== 'contextRevision,contextSha256,ready' ||
      value.ready !== true || typeof value.contextRevision !== 'number' || !Number.isSafeInteger(value.contextRevision) ||
      value.contextRevision <= 0 || value.contextSha256 !== expectedHash) throw new Error('invalid_receipt');
  return { ready: true, contextRevision: value.contextRevision, contextSha256: expectedHash };
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
  let context: string | undefined;
  let capability: string | undefined;
  try {
    value = await boundedBody(request);
    if (c.req.path === '/api/hexa/session') {
      if (Object.keys(value).length !== 0) return response({ error: 'invalid_request' }, 400);
    } else {
      capability = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') ?? '')?.[1];
      if (!capability || typeof value.sessionId !== 'string' || !ID.test(value.sessionId)) return response({ error: 'forbidden' }, 403);
      if (Object.keys(value).sort().join(',') !== 'calendar,sessionId') return response({ error: 'invalid_request' }, 400);
      context = buildCalendarContext(value.calendar);
    }
  } catch { return response({ error: 'invalid_request' }, 400); }
  // shared-protected-voice/2, independently verified 38-input seal:
  // 9f5d626fcdce335e516e98bb552f54c9db4944c012b2f407f2e4ef1bf8281e6d
  // No bearer-only fallback: a legacy/incompatible binding remains unavailable.
  const binding = c.env.HEXA_PROTECTED_CONTROL;
  if (!binding || typeof binding.createSession !== 'function' || typeof binding.setContextForOwner !== 'function') {
    return response({ error: 'calendar_context_contract_unavailable' }, 503);
  }
  try {
    if (context === undefined) {
      const issued = await binding.createSession('normal', CALENDAR_PARENT_ORIGIN, 'calendar');
      const serverNow = Date.now();
      return response({ grant: grantResult(issued, serverNow), serverNow }, 201);
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(context));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const stored = await binding.setContextForOwner(value.sessionId as string, capability!, context, {
      profile: 'calendar', mode: 'normal', parentOrigin: CALENDAR_PARENT_ORIGIN,
    });
    return response(storedResult(stored, hash));
  } catch {
    return response({ error: 'calendar_context_contract_unavailable' }, 503);
  }
});
