import { downloadConsoleLogs } from '../utils/console-log-capture';

export function DownloadLogsButton() {
  return (
    <button
      type="button"
      onClick={downloadConsoleLogs}
      className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      title="Download calendar and Hexa console logs"
      aria-label="Download calendar and Hexa console logs"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5M12 15V3" />
      </svg>
      <span>Download logs</span>
    </button>
  );
}
