export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/leads', label: 'Leads', end: false },
  { to: '/follow-ups', label: 'Follow-ups', end: false },
  { to: '/reports', label: 'Reports', end: false },
  { to: '/settings', label: 'Settings', end: false },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Converted',
  'Lost',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]
