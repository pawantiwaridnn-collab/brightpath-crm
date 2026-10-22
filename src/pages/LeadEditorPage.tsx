import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import { useAuth } from '../features/auth/auth-context.ts'
import { LeadFailure } from '../features/leads/LeadFailure.tsx'
import { LeadForm } from '../features/leads/LeadForm.tsx'
import {
  draftFromLead,
  emptyLeadDraft,
  leadFailureTitle,
  type LeadDraft,
} from '../features/leads/leadValues.ts'
import { createLead, getLead, updateLead } from '../services/leadService.ts'
import { listProfiles } from '../services/profileService.ts'
import type { Lead } from '../types/lead.ts'
import type { Profile } from '../types/profile.ts'

type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; lead: Lead | null; profiles: Profile[] }
  | { status: 'error'; title: string; message: string }

export function LeadEditorPage() {
  const { leadId } = useParams()
  const editorKey = leadId ?? 'new'
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [loadedKey, setLoadedKey] = useState(editorKey)
  const [state, setState] = useState<EditorState>({ status: 'loading' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loadedKey !== editorKey) {
    setLoadedKey(editorKey)
    setState({ status: 'loading' })
    setSaving(false)
    setFormError(null)
  }

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      listProfiles().catch((caught: unknown) => {
        const message = caught instanceof Error ? caught.message : 'Assignee names could not be loaded.'
        return { failed: message }
      }),
      leadId ? getLead(leadId) : Promise.resolve(null),
    ]).then(([profilesResult, leadResult]) => {
      if (cancelled) return
      if (leadResult && !leadResult.ok) {
        setState({
          status: 'error',
          title: leadFailureTitle(leadResult.kind),
          message: leadResult.message,
        })
        return
      }
      const loadedProfiles = Array.isArray(profilesResult) ? profilesResult : []
      setState({
        status: 'ready',
        lead: leadResult?.ok ? leadResult.data : null,
        profiles: loadedProfiles,
      })
      if (!Array.isArray(profilesResult)) setFormError(profilesResult.failed)
    })
    return () => {
      cancelled = true
    }
  }, [leadId])

  const initial = useMemo<LeadDraft>(
    () => (state.status === 'ready' && state.lead ? draftFromLead(state.lead) : emptyLeadDraft),
    [state],
  )

  if (!profile) {
    return <LeadFailure title="Your profile could not be loaded" message="Sign in again before saving a lead." />
  }

  if (state.status === 'loading') {
    return (
      <>
        <header className="page-header">
          <h1>{leadId ? 'Edit lead' : 'New lead'}</h1>
        </header>
        <LoadingState label="Loading the lead form." />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <header className="page-header">
          <h1>Edit lead</h1>
          <p>
            <Link className="text-link" to="/leads">
              Back to leads
            </Link>
          </p>
        </header>
        <LeadFailure title={state.title} message={state.message} />
      </>
    )
  }

  const known = new Set(state.profiles.map((item) => item.id))
  const assigneeChoices = known.has(profile.id) ? state.profiles : [profile, ...state.profiles]
  const preserved =
    state.lead?.assignedTo && !assigneeChoices.some((item) => item.id === state.lead?.assignedTo)
      ? { id: state.lead.assignedTo, label: state.lead.assigneeName ?? 'Current assignee' }
      : null

  return (
    <>
      <header className="page-header">
        <h1>{state.lead ? 'Edit lead' : 'New lead'}</h1>
        <p>Name, phone, course, and source are required. Role cannot be changed here.</p>
      </header>
      <LeadForm
        initial={initial}
        profiles={assigneeChoices}
        preservedAssignee={preserved}
        saving={saving}
        formError={formError}
        cancelTo={state.lead ? `/leads/${state.lead.id}` : '/leads'}
        submitLabel={state.lead ? 'Save changes' : 'Create lead'}
        onSave={(value) => {
          if (!profile) return
          setSaving(true)
          setFormError(null)
          const request = state.lead
            ? updateLead(state.lead.id, { ...value, createdBy: state.lead.createdBy })
            : createLead({ ...value, createdBy: profile.id })
          void request.then((result) => {
            if (!result.ok) {
              setFormError(result.message)
              setSaving(false)
              return
            }
            navigate(`/leads/${result.data.id}`)
          })
        }}
      />
    </>
  )
}
