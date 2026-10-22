import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Profile } from '../../types/profile.ts'
import { validateFollowUpDraft, type FollowUpDraft, type FollowUpFieldErrors } from './followUpValues.ts'

type LeadChoice = {
  id: string
  fullName: string
}

type FollowUpFormProps = {
  leads: LeadChoice[]
  profiles: Profile[]
  initialLeadId: string
  initialAssigneeId: string
  lockLead: boolean
  saving: boolean
  formError: string | null
  cancelTo: string
  onSave: (value: { leadId: string; dueAt: string; note: string; assignedTo: string }) => void
}

export function FollowUpForm({
  leads,
  profiles,
  initialLeadId,
  initialAssigneeId,
  lockLead,
  saving,
  formError,
  cancelTo,
  onSave,
}: FollowUpFormProps) {
  const [draft, setDraft] = useState<FollowUpDraft>({
    leadId: initialLeadId,
    dueAt: '',
    note: '',
    assignedTo: initialAssigneeId,
  })
  const [errors, setErrors] = useState<FollowUpFieldErrors>({})

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateFollowUpDraft(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    onSave(result.value)
  }

  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      {formError ? (
        <p className="form-error field-wide" role="alert">
          {formError}
        </p>
      ) : null}
      <label className="field field-wide">
        <span>Lead</span>
        <select
          value={draft.leadId}
          onChange={(event) => setDraft((current) => ({ ...current, leadId: event.target.value }))}
          disabled={saving || lockLead}
        >
          <option value="">Choose a lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.fullName}
            </option>
          ))}
        </select>
        {errors.leadId ? <FieldError message={errors.leadId} /> : null}
      </label>
      <label className="field">
        <span>Due</span>
        <input
          type="datetime-local"
          value={draft.dueAt}
          onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))}
          disabled={saving}
        />
        {errors.dueAt ? <FieldError message={errors.dueAt} /> : null}
      </label>
      <label className="field">
        <span>Assignee</span>
        <select
          value={draft.assignedTo}
          onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))}
          disabled={saving}
        >
          <option value="">Choose an assignee</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.fullName}
            </option>
          ))}
        </select>
        {errors.assignedTo ? <FieldError message={errors.assignedTo} /> : null}
      </label>
      <label className="field field-wide">
        <span>Note</span>
        <textarea
          rows={4}
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          disabled={saving}
        />
        {errors.note ? <FieldError message={errors.note} /> : null}
      </label>
      <div className="form-actions field-wide">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving' : 'Schedule follow-up'}
        </button>
        <Link className="button-link button-quiet" to={cancelTo}>
          Cancel
        </Link>
      </div>
    </form>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <span className="form-error" role="alert">
      {message}
    </span>
  )
}
