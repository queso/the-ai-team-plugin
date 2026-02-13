import type { ConnectionStatus, ConnectionStatusIndicatorProps } from '@/types';

const STATUS_DOT_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-amber-500',
  disconnected: 'bg-red-500',
  error: 'bg-red-500',
};

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  error: 'Error',
};

function getStatusText(status: ConnectionStatus, error?: Error | null): string {
  if (status === 'error' && error?.message) {
    return error.message;
  }
  return STATUS_TEXT[status];
}

export function ConnectionStatusIndicator({
  status,
  error,
  className,
}: ConnectionStatusIndicatorProps) {
  const dotColorClass = STATUS_DOT_COLORS[status];
  const displayText = getStatusText(status, error);

  return (
    <div
      data-testid="connection-status-indicator"
      data-status={status}
      role="status"
      aria-label={`Connection status: ${status}`}
      className={`flex items-center gap-2 ${className ?? ''}`.trim()}
    >
      <span
        data-testid="connection-status-dot"
        className={`rounded-full w-2 h-2 ${dotColorClass}`}
      />
      <span>{displayText}</span>
    </div>
  );
}
