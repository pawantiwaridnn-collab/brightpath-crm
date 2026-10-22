import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import { useAuth } from '../features/auth/auth-context.ts'
import { FollowUpForm } from '../features/followups/FollowUpForm.tsx'
import { followUpFailureTitle } from '../features/followups/followUpValues.ts'
import { LeadFailure } from '../features/leads/LeadFailure.tsx'
import { leadFailureTitle } from '../features/leads/leadValues.ts'
import { createFollowUp } from '../services/followUpService.ts'
import { getLead, listWorkingLeadChoices } from '../services/leadService.ts'
import { listProfiles } from '../services/profileService.ts'
import type { Profile } from '../types/profile.ts'

type LeadChoice = {
  id: string
  fullName: string
}

type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; leads: LeadChoice[]; profiles: Profile[]; lockLead: boolean }
  | { status: 'error'; title: string; message: string }

export function FollowUpEditorPage() {
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
      listWorkingLeadChoices(),
      listProfiles().catch((caught: unknown) => {
        const message = caught instanceof Error ? caught.message : 'Assignee names could not be loaded.'
        return { failed: message }
      }),
      leadId ? getLead(leadId) : Promise.resolve(null),
    ]).then(([leadChoices, profilesResult, preset]) => {
      if (cancelled) return
      if (!leadChoices.ok) {
        setState({
          status: 'error',
          title: leadFailureTitle(leadChoices.kind),
          message: leadChoices.message,
        })
        return
      }
      if (preset && !preset.ok) {
        setState({
          status: 'error',
          title: leadFailureTitle(preset.kind),
          message: preset.message,
        })
        return
      }
      if (preset?.ok && preset.data.archivedAt) {
        setState({
          status: 'error',
          title: 'This lead is archived',
          message: 'Restore the lead before scheduling a follow-up.',
        })
        return
      }

      const leads = [...leadChoices.data]
      if (preset?.ok && !leads.some((lead) => lead.id === preset.data.id)) {
        leads.unshift({ id: preset.data.id, fullName: preset.data.fullName })
      }

      const loadedProfiles = Array.isArray(profilesResult) ? profilesResult : []
      setState({
        status: 'ready',
        leads,
        profiles: loadedProfiles,
        lockLead: Boolean(preset?.ok),
      })
      setFormError(Array.isArray(profilesResult) ? null : profilesResult.failed)
    })
    return () => {
      cancelled = true
    }
  }, [leadId])

  if (!profile) {
    return (
      <LeadFailure title="Your profile could not be loaded" message="Sign in again before scheduling a follow-up." />
    )
  }

  const cancelTo = leadId ? `/leads/${leadId}` : '/follow-ups'
  const assignees =
    profile.role === 'counsellor'
      ? [profile]
      : state.status === 'ready' && state.profiles.some((item) => item.id === profile.id)
        ? state.profiles
        : state.status === 'ready'
          ? [profile, ...state.profiles]
          : [profile]

  return (
    <>
      <header className="page-header">
        <h1>Schedule follow-up</h1>
        <p>
          <Link className="text-link" to={cancelTo}>
            {leadId ? 'Back to lead' : 'Back to follow-ups'}
          </Link>
        </p>
      </header>
      {state.status === 'loading' ? <LoadingState label="Loading the follow-up form." /> : null}
      {state.status === 'error' ? <LeadFailure title={state.title} message={state.message} /> : null}
      {state.status === 'ready' && state.leads.length === 0 ? (
        <EmptyState title="No open leads" description="Create a lead before scheduling a follow-up." />
      ) : null}
      {state.status === 'ready' && state.leads.length > 0 ? (
        <FollowUpForm
          key={`${editorKey}:${profile.id}`}
          leads={state.leads}
          profiles={assignees}
          initialLeadId={leadId ?? ''}
          initialAssigneeId={profile.id}
          lockLead={state.lockLead}
          saving={saving}
          formError={formError}
          cancelTo={cancelTo}
          onSave={(value) => {
            setSaving(true)
            setFormError(null)
            void createFollowUp({
              leadId: value.leadId,
              assignedTo: value.assignedTo,
              dueAt: value.dueAt,
              note: value.note,
              createdBy: profile.id,
            }).then((result) => {
              if (!result.ok) {
                setSaving(false)
                setFormError(followUpFailureTitle(result.kind) + '. ' + result.message)
                return
              }
              const overdue = new Date(value.dueAt).getTime() < Date.now()
              navigate(overdue ? '/follow-ups?view=overdue' : '/follow-ups')
            })
          }}
        />
      ) : null}
    </>
  )
}
