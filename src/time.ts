export function addMonths(date: Date, months: number): Date {
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const result = new Date(date);
  result.setUTCFullYear(year, month, Math.min(date.getUTCDate(), lastDay));
  return result;
}

export function isStale(lastPublish: Date, now: Date, months: number): boolean {
  return lastPublish < addMonths(now, -months);
}

export function relativeAge(iso: string, now: Date): string {
  const date = new Date(iso);

  if (date > now) {
    return '0d ago';
  }

  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 30) {
    return `${days}d ago`;
  }

  let months = 0;
  while (addMonths(date, months + 1) <= now) {
    months++;
  }

  if (months < 12) {
    return `${months}m ago`;
  }

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
