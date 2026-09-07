/**
 * Adapted from Codegen-Hexa: one text download for the calendar page and its
 * embedded Hexa console. HexaWorker forwards relay payloads only after checking
 * the configured worker origin and iframe window. Logs last for this page load.
 */
import { sessionManager } from './sessionManager';
import {
  getRollingConsoleEntryKey,
  shouldRetainPreviousRollingEntry,
  trimRelayedConsoleValue,
} from './console-log-compaction';

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn';
type ConsoleLogSource = 'calendar' | 'hexa';

interface CapturedConsoleEntry {
  compactionKey: string | null;
  source: ConsoleLogSource;
  method: ConsoleMethod;
  timestamp: string;
  sessionId: string | null;
  message: string;
}

interface CapturedConsoleSnapshot {
  entries: CapturedConsoleEntry[];
  requestedAt: string;
  compactedRollingEntryCount: number;
  evictedEntryCount: number;
}

interface WritableDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface WindowWithDirectoryPicker extends Window {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<WritableDirectoryHandle>;
}

const CONSOLE_METHODS: ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug'];
const MAX_LOG_ENTRIES = 5000;
const MAX_ARG_LENGTH = 4000;
const DOWNLOAD_DIRECTORY_DB = 'infflow-calendar-download-directory';
const DOWNLOAD_DIRECTORY_STORE = 'handles';
const DOWNLOAD_DIRECTORY_KEY = 'console-logs';
const capturedEntries: CapturedConsoleEntry[] = [];
let isInstalled = false;
let isDownloadInFlight = false;
let compactedRollingEntryCount = 0;
let evictedEntryCount = 0;

function trimSerializedValue(value: string): string {
  return value.length <= MAX_ARG_LENGTH
    ? value
    : `${value.slice(0, MAX_ARG_LENGTH)}... [truncated]`;
}

function serializeConsoleArg(arg: unknown): string {
  try {
    if (typeof arg === 'string') return trimSerializedValue(arg);
    if (typeof arg === 'bigint') return `${arg.toString()}n`;
    if (arg instanceof Error) {
      return trimSerializedValue(arg.stack || `${arg.name}: ${arg.message}`);
    }
    if (typeof Element !== 'undefined' && arg instanceof Element) {
      const id = arg.id ? `#${arg.id}` : '';
      const classes = typeof arg.className === 'string'
        ? arg.className.trim().split(/\s+/).filter(Boolean).map((name) => `.${name}`).join('')
        : '';
      return trimSerializedValue(`<${arg.tagName.toLowerCase()}${id}${classes}>`);
    }

    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(arg, (_key, value: unknown) => {
      if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
      if (typeof value === 'bigint') return `${value.toString()}n`;
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }, 2);
    return trimSerializedValue(serialized ?? String(arg));
  } catch {
    try {
      return trimSerializedValue(String(arg));
    } catch {
      return '[Unserializable value]';
    }
  }
}

function isConsoleMethod(value: unknown): value is ConsoleMethod {
  return typeof value === 'string' && CONSOLE_METHODS.includes(value as ConsoleMethod);
}

function pushCapturedEntry(entry: Omit<CapturedConsoleEntry, 'compactionKey'>): void {
  const compactionKey = entry.source === 'hexa'
    ? getRollingConsoleEntryKey(entry.message, entry.source, entry.sessionId)
    : null;
  if (compactionKey) {
    const previousIndex = capturedEntries.findIndex((item) => item.compactionKey === compactionKey);
    if (shouldRetainPreviousRollingEntry(entry.message, previousIndex >= 0)) {
      compactedRollingEntryCount += 1;
      return;
    }
    if (previousIndex >= 0) {
      capturedEntries.splice(previousIndex, 1);
      compactedRollingEntryCount += 1;
    }
  }
  capturedEntries.push({ ...entry, compactionKey });
  if (capturedEntries.length > MAX_LOG_ENTRIES) {
    const overflow = capturedEntries.length - MAX_LOG_ENTRIES;
    capturedEntries.splice(0, overflow);
    evictedEntryCount += overflow;
  }
}

/** Call only for a HEXA_CONSOLE_LOG message from the trusted iframe. */
export function captureHexaConsoleEntry(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return;
  const entry = payload as Record<string, unknown>;
  if (!isConsoleMethod(entry.method)) return;

  const args = Array.isArray(entry.args)
    ? entry.args.filter((arg): arg is string => typeof arg === 'string').map(trimRelayedConsoleValue)
    : [];
  const message = typeof entry.message === 'string'
    ? trimRelayedConsoleValue(entry.message)
    : args.join(' ');
  const timestamp = typeof entry.timestamp === 'string' && Number.isFinite(Date.parse(entry.timestamp))
    ? entry.timestamp
    : new Date().toISOString();
  pushCapturedEntry({
    source: 'hexa',
    method: entry.method,
    timestamp,
    sessionId: typeof entry.sessionId === 'string' ? entry.sessionId : null,
    message,
  });
}

function buildConsoleLogFile(sessionId: string | null, snapshot: CapturedConsoleSnapshot): string {
  // Include the whole page load, including startup and sessions before a reset.
  const { entries } = snapshot;
  const hexaCount = entries.filter((entry) => entry.source === 'hexa').length;
  const lines = [
    'Infflow Calendar Console Logs',
    `Download requested / console snapshot boundary: ${snapshot.requestedAt}`,
    `Active voice session at download: ${sessionId || 'none'}`,
    'Included sources: Calendar page, Hexa voice iframe',
    `Captured entries: ${entries.length}`,
    `Source counts: calendar=${entries.length - hexaCount}, hexa=${hexaCount}`,
    `Rolling snapshots compacted page-wide through the snapshot boundary: ${snapshot.compactedRollingEntryCount}`,
    `Entries evicted page-wide through the snapshot boundary by the ${MAX_LOG_ENTRIES}-entry retention cap: ${snapshot.evictedEntryCount}`,
    '',
  ];
  if (entries.length === 0) lines.push('No console entries were captured on this page load.');
  for (const entry of entries) {
    const message = entry.message.replace(/\n/g, '\n  ');
    lines.push(`[${entry.timestamp}] [${entry.source}] [${entry.method.toUpperCase()}] [session:${entry.sessionId || 'none'}] ${message}`);
  }
  return lines.join('\n');
}

function makeConsoleLogFilename(sessionId: string | null): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  // Match the reference's newest-first ordering when filenames sort ascending.
  const invertedKey = (9999999999999 - now.getTime()).toString().padStart(13, '0');
  const sessionSlug = (sessionId || 'no-session').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `infflow-calendar-logs-${invertedKey}-${timestamp}-${sessionSlug}.txt`;
}

function downloadTextFileWithBrowser(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

function openDownloadDirectoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DOWNLOAD_DIRECTORY_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DOWNLOAD_DIRECTORY_STORE)) {
        request.result.createObjectStore(DOWNLOAD_DIRECTORY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredDownloadDirectory(): Promise<WritableDirectoryHandle | null> {
  if (!window.indexedDB) return null;
  const database = await openDownloadDirectoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DOWNLOAD_DIRECTORY_STORE, 'readonly');
    const request = transaction.objectStore(DOWNLOAD_DIRECTORY_STORE).get(DOWNLOAD_DIRECTORY_KEY);
    request.onsuccess = () => resolve((request.result as WritableDirectoryHandle | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function storeDownloadDirectory(directory: WritableDirectoryHandle): Promise<void> {
  if (!window.indexedDB) return;
  const database = await openDownloadDirectoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DOWNLOAD_DIRECTORY_STORE, 'readwrite');
    transaction.objectStore(DOWNLOAD_DIRECTORY_STORE).put(directory, DOWNLOAD_DIRECTORY_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function canWriteToDirectory(directory: WritableDirectoryHandle): Promise<boolean> {
  if (await directory.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
  return await directory.requestPermission({ mode: 'readwrite' }) === 'granted';
}

type DownloadDestination =
  | { kind: 'directory'; directory: WritableDirectoryHandle }
  | { kind: 'browser' }
  | { kind: 'cancelled' };

async function acquireDownloadDestination(): Promise<DownloadDestination> {
  const directoryPicker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (!directoryPicker) return { kind: 'browser' };
  try {
    let directory: WritableDirectoryHandle | null = null;
    try {
      directory = await getStoredDownloadDirectory();
    } catch (error) {
      console.warn('[ConsoleLogs] Could not read the saved download directory.', error);
    }
    if (directory && !await canWriteToDirectory(directory)) directory = null;
    if (!directory) {
      directory = await directoryPicker.call(window, {
        id: 'infflow-calendar-console-logs',
        mode: 'readwrite',
      });
      try {
        await storeDownloadDirectory(directory);
      } catch (error) {
        console.warn('[ConsoleLogs] Could not remember the selected download directory.', error);
      }
    }
    return { kind: 'directory', directory };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { kind: 'cancelled' };
    console.error('[ConsoleLogs] Failed to access the selected download directory.', error);
    window.alert('Unable to save console logs to the selected folder. Please try again.');
    return { kind: 'cancelled' };
  }
}

async function writeDirectoryFile(
  directory: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<void> {
  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // Preserve the original write failure.
    }
    throw error;
  }
}

async function downloadConsoleLogBundle(
  sessionId: string | null,
  filename: string,
  snapshot: CapturedConsoleSnapshot
): Promise<void> {
  const destination = await acquireDownloadDestination();
  if (destination.kind === 'cancelled') return;
  const content = buildConsoleLogFile(sessionId, snapshot);
  if (destination.kind === 'browser') {
    downloadTextFileWithBrowser(content, filename);
  } else {
    await writeDirectoryFile(destination.directory, filename, content);
  }
}

export function installConsoleLogCapture(): void {
  if (isInstalled || typeof window === 'undefined') return;
  for (const method of CONSOLE_METHODS) {
    const originalMethod = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      try {
        pushCapturedEntry({
          source: 'calendar',
          method,
          timestamp: new Date().toISOString(),
          sessionId: sessionManager.getSessionId(),
          message: args.map(serializeConsoleArg).join(' '),
        });
      } catch {
        // Logging must never interrupt application code or console output.
      }
      originalMethod(...args);
    };
  }
  isInstalled = true;
}

export function downloadConsoleLogs(): void {
  if (typeof document === 'undefined' || isDownloadInFlight) return;
  isDownloadInFlight = true;
  const sessionId = sessionManager.getSessionId();
  // Freeze before opening the picker: later activity belongs to the next file.
  const snapshot: CapturedConsoleSnapshot = {
    entries: capturedEntries.slice(),
    requestedAt: new Date().toISOString(),
    compactedRollingEntryCount,
    evictedEntryCount,
  };
  void downloadConsoleLogBundle(sessionId, makeConsoleLogFilename(sessionId), snapshot)
    .catch((error) => {
      console.error('[ConsoleLogs] Failed while writing the console log file.', error);
      window.alert('The console log file could not be written. Please try again.');
    })
    .finally(() => {
      isDownloadInFlight = false;
    });
}
