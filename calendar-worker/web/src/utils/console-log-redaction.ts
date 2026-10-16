// Redact before both capture and ordinary console output. Keep safe diagnostics.
const PRIVATE_KEY = /^(?:authorization|capability|callCapability|client[_-]secret|api[_-]?key|openai_api_key|instructions|policy|hiddenContext|context|calendarData|mermaidCode|providerFrame|providerEvent|callId|call_id|sdp)$/i;

export function redactDiagnosticText(value: string): string {
  if (/["']?(?:instructions|policy|hiddenContext|context|calendarData|mermaidCode|providerFrame|providerEvent|sdp)["']?\s*[:=]/i.test(value)
    || /["'](?:event_id|type)["']\s*:\s*["'](?:response\.|session\.|conversation\.|rate_limits\.|input_audio_buffer\.|output_audio_buffer\.)/.test(value)
    || /^v=0\r?\n/.test(value)) return '[private diagnostic redacted]';
  return value
    .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/\b(?:rtc_|call_)[a-zA-Z0-9_-]{8,}/g, '[redacted]')
    .replace(/\b[a-f0-9]{64}\b/gi, '[redacted]')
    .replace(/(["']?(?:capability|callCapability|client[_-]secret|authorization|api[_-]?key|openai_api_key|instructions|policy|hiddenContext|context|calendarData|mermaidCode|providerFrame|providerEvent|callId|call_id|sdp)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,}]+)/gi, '$1[redacted]');
}

export function redactDiagnosticValue(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (typeof value === 'string') return redactDiagnosticText(value);
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Error) return redactDiagnosticText(value.stack || `${value.name}: ${value.message}`);
  if (value instanceof Date) return value;
  if (typeof Element !== 'undefined' && value instanceof Element) return value;
  if (depth > 12) return '[depth limit]';
  if (seen.has(value)) return '[Circular]';
  const record = value as Record<string, unknown>;
  if ('event_id' in record || (typeof record.type === 'string' && /^(?:response|session|conversation|rate_limits|input_audio_buffer|output_audio_buffer)\./.test(record.type))) {
    return '[provider diagnostic redacted]';
  }
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => redactDiagnosticValue(item, seen, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = PRIVATE_KEY.test(key) ? '[redacted]' : redactDiagnosticValue(item, seen, depth + 1);
  }
  return result;
}
