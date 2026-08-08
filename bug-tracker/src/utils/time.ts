/**
 * Parse a timestamp coming from the collector.
 *
 * The backend emits naive UTC timestamps via `datetime.utcnow().isoformat()`,
 * e.g. "2026-08-08T16:01:13.833000" — with NO timezone designator. JavaScript
 * parses a date-time string without an offset as *local* time, which shifts the
 * value by the viewer's UTC offset (so a UTC 16:01 shows as 16:01 local instead
 * of the correct local time). We fix that by treating any marker-less date-time
 * string as UTC (appending 'Z'). Strings that already carry 'Z' or a ±HH:MM
 * offset (e.g. SDK breadcrumbs from `toISOString()`) are left untouched.
 */
export const parseServerDate = (dateStr: string | number | Date | null | undefined): Date => {
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);
  if (!dateStr) return new Date(NaN);
  if (dateStr.includes('T') && !/(Z|[+-]\d{2}:?\d{2})$/.test(dateStr)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};

export const formatRelativeDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return { label: 'Never', days: Infinity };
  const diffMs = Date.now() - parseServerDate(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return { label: 'Today', days };
  if (days === 1) return { label: 'Yesterday', days };
  if (days < 7) return { label: `${days}d ago`, days };
  if (days < 30) return { label: `${Math.floor(days / 7)}w ago`, days };
  if (days < 365) return { label: `${Math.floor(days / 30)}mo ago`, days };
  return { label: `${Math.floor(days / 365)}y ago`, days };
};
