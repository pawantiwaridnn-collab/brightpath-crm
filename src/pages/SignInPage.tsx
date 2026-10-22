import { useState, type FormEvent } from 'react'
import { SkipLink } from '../components/ui/SkipLink.tsx'
import { useAuth } from '../features/auth/auth-context.ts'

type SignInPageProps = {
  notice?: string
}

export function SignInPage({ notice }: SignInPageProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const message = await signIn(email, password)
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  const blocked = saving || email.trim() === '' || password === ''

  return (
    <>
    <SkipLink />
    <main className="config-screen" id="main" tabIndex={-1}>
      <div className="config-card page-stage">
        <p className="config-kicker">BrightPath CRM</p>
        <h1>Sign in</h1>
        <p>Use the account created for this admissions desk.</p>
        {notice ? <p className="session-notice">{notice}</p> : null}
        <form onSubmit={(event) => void onSubmit(event)}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={blocked}>
            {saving ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
    </>
  )
}
