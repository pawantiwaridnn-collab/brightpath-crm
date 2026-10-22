import { createContext, useContext } from 'react'
import type { Profile } from '../../types/profile.ts'

export type AuthState =
  | { status: 'checking' }
  | { status: 'signed-out'; notice?: string }
  | { status: 'missing-profile' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string }

export type AuthContextValue = {
  state: AuthState
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  replaceProfile: (profile: Profile) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
