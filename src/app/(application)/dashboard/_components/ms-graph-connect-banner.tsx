import { PlugZap } from "lucide-react";

interface Props {
  connected: boolean;
}

export function MsGraphConnectBanner({ connected }: Props) {
  if (connected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Microsoft account not connected"
      data-testid="ms-graph-connect-banner"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm sm:flex-nowrap dark:border-amber-800 dark:bg-amber-950/30"
    >
      <div
        id="ms-graph-banner-msg"
        className="flex items-center gap-2 text-amber-800 dark:text-amber-300"
      >
        <PlugZap className="h-4 w-4 shrink-0" />
        <span>
          Connect your Microsoft account to send emails from your Outlook
          mailbox.
        </span>
      </div>
      <a
        data-testid="ms-graph-connect-link"
        href="/api/auth/ms-graph/start"
        aria-describedby="ms-graph-banner-msg"
        aria-label="Connect your Microsoft account"
        rel="noopener noreferrer"
        className="shrink-0 rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white text-xs hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-amber-900 focus-visible:outline-offset-2 dark:bg-amber-700 dark:hover:bg-amber-600"
      >
        Connect
      </a>
    </div>
  );
}
