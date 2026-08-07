export const formatRelativeDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return { label: 'Never', days: Infinity };
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return { label: 'Today', days };
  if (days === 1) return { label: 'Yesterday', days };
  if (days < 7) return { label: `${days}d ago`, days };
  if (days < 30) return { label: `${Math.floor(days / 7)}w ago`, days };
  if (days < 365) return { label: `${Math.floor(days / 30)}mo ago`, days };
  return { label: `${Math.floor(days / 365)}y ago`, days };
};
