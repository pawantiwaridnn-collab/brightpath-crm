import { LoadingState } from '../ui/LoadingState.tsx'
import { SkipLink } from '../ui/SkipLink.tsx'

type ConfigScreenProps = {
  missing?: string[]
  error?: string
  pending?: boolean
}

export function ConfigScreen({ missing = [], error, pending = false }: ConfigScreenProps) {
  const title = error
    ? 'Supabase did not accept the connection'
    : pending
      ? 'Checking the Supabase project'
      : 'Supabase is not configured'

  return (
    <>
    <SkipLink />
    <main className="config-screen" id="main" tabIndex={-1}>
      <div className="config-card">
        <p className="config-kicker">BrightPath CRM</p>
        <h1>{title}</h1>
        {pending ? (
          <LoadingState label="Contacting Supabase. No records are being loaded." />
        ) : null}
        {error ? (
          <>
            <p>The admissions desk stays closed until the project accepts this browser.</p>
            <p className="config-detail">{error}</p>
          </>
        ) : null}
        {!pending && !error ? (
          <>
            <p>
              BrightPath CRM is not using sample data. Add the missing variables to
              .env in the project root, then restart the dev server.
            </p>
            <ul className="config-list">
              {missing.map((name) => (
                <li key={name}>
                  <code>{name}</code>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </main>
    </>
  )
}
