import { useState, type FormEvent } from 'react'
import { useAuth } from '../features/auth/auth-context.ts'
import { setDensity, useDensity, type Density } from '../features/settings/density.ts'
import { updateDisplayName } from '../services/profileService.ts'
import { profileRoleLabel } from '../types/profile.ts'

export function SettingsPage() {
  const { profile, replaceProfile } = useAuth()
  const density = useDensity()
  const [name, setName] = useState(profile?.fullName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || saving) return
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      setSaved(false)
      setError('Enter a display name.')
      return
    }
    if (trimmed.length > 80) {
      setSaved(false)
      setError('Use 80 characters or fewer.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await updateDisplayName(profile.id, trimmed)
    setSaving(false)
    if (!result.ok) {
      setSaved(false)
      setError(result.message)
      return
    }
    setName(result.profile.fullName)
    replaceProfile(result.profile)
    setSaved(true)
  }

  function chooseDensity(value: Density) {
    setDensity(value)
  }

  return (
    <>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Profile name and simple preferences.</p>
      </header>
      {profile ? (
        <section className="panel" aria-labelledby="account-heading">
          <h2 id="account-heading">Account</h2>
          <form onSubmit={(event) => void onSubmit(event)}>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                maxLength={80}
                autoComplete="name"
                disabled={saving}
                onChange={(event) => {
                  setName(event.target.value)
                  setSaved(false)
                }}
              />
            </label>
            <dl className="identity">
              <div>
                <dt>Role</dt>
                <dd>{profileRoleLabel(profile.role)}</dd>
              </div>
            </dl>
            <p>Role is assigned in the database and cannot be changed here.</p>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            {saved ? <p role="status">Name saved.</p> : null}
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving' : 'Save name'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      <section className="panel" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">Preferences</h2>
        <fieldset className="density-choices">
          <legend>Density</legend>
          <label>
            <input
              type="radio"
              name="density"
              value="comfortable"
              checked={density === 'comfortable'}
              onChange={() => chooseDensity('comfortable')}
            />
            Comfortable
          </label>
          <label>
            <input
              type="radio"
              name="density"
              value="compact"
              checked={density === 'compact'}
              onChange={() => chooseDensity('compact')}
            />
            Compact
          </label>
        </fieldset>
        <p className="muted">Stored on this browser. It does not change enquiry data.</p>
      </section>
    </>
  )
}
