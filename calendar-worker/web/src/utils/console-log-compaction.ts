// Keep the same rolling Hexa snapshot behavior as Codegen-Hexa's log export.
const MAX_CONSOLE_VALUE_LENGTH = 4000;
const MAX_VISEME_STATS_VALUE_LENGTH = 64000;
const TRUNCATED_VALUE_SUFFIX = '... [truncated]';

const VISEME_STATS_LOG_PREFIXES = [
  '[Hexa O-shape stats] ',
  '[Hexa closed-shape stats] ',
] as const;

export function trimRelayedConsoleValue(value: string): string {
  const maxLength = VISEME_STATS_LOG_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? MAX_VISEME_STATS_VALUE_LENGTH
    : MAX_CONSOLE_VALUE_LENGTH;
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength)}${TRUNCATED_VALUE_SUFFIX}`;
}

export function getRollingConsoleEntryKey(
  message: string,
  source: string,
  sessionId: string | null
): string | null {
  const prefix = VISEME_STATS_LOG_PREFIXES.find((candidate) => message.startsWith(candidate));
  if (!prefix) return null;

  const runId = message.slice(prefix.length).match(/"runId"\s*:\s*"([^"]+)"/)?.[1];
  if (!runId) return null;

  return `${source}\u0000${sessionId ?? ''}\u0000${prefix}\u0000${runId}`;
}

export function shouldRetainPreviousRollingEntry(
  message: string,
  hasPreviousEntry: boolean
): boolean {
  return hasPreviousEntry && message.endsWith(TRUNCATED_VALUE_SUFFIX);
}
