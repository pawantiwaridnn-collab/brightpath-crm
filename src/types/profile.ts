export type ProfileRole = 'admin' | 'manager' | 'counsellor'

export type Profile = {
  id: string
  fullName: string
  role: ProfileRole
}

export function profileRoleLabel(role: ProfileRole): string {
  if (role === 'admin') return 'Admin'
  if (role === 'manager') return 'Manager'
  return 'Counsellor'
}

export function isProfileRole(value: string): value is ProfileRole {
  return value === 'admin' || value === 'manager' || value === 'counsellor'
}
