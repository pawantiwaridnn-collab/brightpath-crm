import { SkipLink } from '../components/ui/SkipLink.tsx'
import { useAuth } from '../features/auth/auth-context.ts'

export function MissingProfilePage() {
  const { signOut } = useAuth()

  return (
    <>
    <SkipLink />
    <main className="config-screen" id="main" tabIndex={-1}>
      <div className="config-card page-stage">
        <p className="config-kicker">BrightPath CRM</p>
        <h1>Your account has no profile yet</h1>
        <p>
          The desk stays closed until a profile row exists for this sign-in. This page
          cannot assign a role.
        </p>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </main>
    </>
  )
}
