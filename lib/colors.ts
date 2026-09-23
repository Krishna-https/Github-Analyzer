export const severityColor: Record<string, string> = {
  Critical: 'bg-red-950/80 text-red-300 border border-red-800/60',
  High: 'bg-orange-950/80 text-orange-300 border border-orange-800/60',
  Medium: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
  Low: 'bg-sky-950/80 text-sky-300 border border-sky-800/60',
}

export const severityDot: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-sky-500',
}

export const depStatusColor: Record<string, string> = {
  healthy: 'text-emerald-400',
  review: 'text-amber-400',
  vulnerable: 'text-red-400',
}

export const depStatusLabel: Record<string, string> = {
  healthy: '✓ Healthy',
  review: '⚠ Review',
  vulnerable: '✕ Vulnerable',
}

export const statusBadgeColor: Record<string, string> = {
  Good: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60',
  Moderate: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
  'Needs Review': 'bg-orange-950/80 text-orange-300 border border-orange-800/60',
  High: 'bg-red-950/80 text-red-300 border border-red-800/60',
  Critical: 'bg-red-950 text-red-200 border border-red-700',
}