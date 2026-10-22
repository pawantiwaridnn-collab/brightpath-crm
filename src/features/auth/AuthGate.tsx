import type { ReactNode } from 'react'
import { LoadingState } from '../../components/ui/LoadingState.tsx'
import { SkipLink } from '../../components/ui/SkipLink.tsx'
import { MissingProfilePage } from '../../pages/MissingProfilePage.tsx'
import { SignInPage } from '../../pages/SignInPage.tsx'
import { useAuth } from './auth-context.ts'

type AuthGateProps = {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const { state, signOut } = useAuth()

  if (state.status === 'checking') {
    return (
      <>
        <SkipLink />
        <main className="config-screen" id="main" tabIndex={-1}>
        <div className="config-card">
          <p className="config-kicker">BrightPath CRM</p>
          <h1>Checking your session</h1>
          <LoadingState label="Looking for a saved sign-in. No records are being loaded." />
        </div>
        </main>
      </>
    )
  }

  if (state.status === 'signed-out') return <SignInPage notice={state.notice} />
  if (state.status === 'missing-profile') return <MissingProfilePage />

  if (state.status === 'error') {
    return (
      <>
        <SkipLink />
        <main className="config-screen" id="main" tabIndex={-1}>
        <div className="config-card">
          <p className="config-kicker">BrightPath CRM</p>
          <h1>Your profile could not be loaded</h1>
          <p>The admissions desk stays closed until the profile read succeeds.</p>
          <p className="config-detail">{state.message}</p>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        </main>
      </>
    )
  }

  return children
}
