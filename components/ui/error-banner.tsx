import { AlertTriangle, RotateCw } from "lucide-react";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-negative/20 bg-negative-bg px-4 py-3 text-sm text-negative">
      <AlertTriangle aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-full bg-negative px-3 py-1.5 text-xs font-semibold text-white hover:bg-negative/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-negative focus-visible:ring-offset-2"
        >
          <RotateCw aria-hidden className="size-3.5" /> Try again
        </button>
      )}
    </div>
  );
}
