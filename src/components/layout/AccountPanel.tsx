import { useAuth } from '../../features/auth/auth-context.ts'
import { profileRoleLabel } from '../../types/profile.ts'

export function AccountPanel() {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  return (
    <div className="account-panel">
      <p className="account-name">{profile.fullName}</p>
      <p className="account-role">{profileRoleLabel(profile.role)}</p>
      <button type="button" className="account-signout" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  )
}
