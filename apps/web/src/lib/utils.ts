export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatSeconds(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return '—';
  }

  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

const USER_ID_STORAGE_KEY = 'filldesk.userId';

export function getStoredUserId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(USER_ID_STORAGE_KEY) ?? '';
}

export function setStoredUserId(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
}