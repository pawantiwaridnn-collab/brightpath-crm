import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LEAD_STATUSES } from '../../types/navigation.ts'
import { LEAD_SOURCES, leadSourceLabel, type LeadWrite } from '../../types/lead.ts'
import type { Profile } from '../../types/profile.ts'
import {
  validateLeadDraft,
  type LeadDraft,
  type LeadFieldErrors,
} from './leadValues.ts'

type PreservedAssignee = {
  id: string
  label: string
}

type LeadFormProps = {
  initial: LeadDraft
  profiles: Profile[]
  preservedAssignee: PreservedAssignee | null
  saving: boolean
  formError: string | null
  cancelTo: string
  submitLabel: string
  onSave: (value: Omit<LeadWrite, 'createdBy'>) => void
}

export function LeadForm({
  initial,
  profiles,
  preservedAssignee,
  saving,
  formError,
  cancelTo,
  submitLabel,
  onSave,
}: LeadFormProps) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<LeadFieldErrors>({})

  function update(field: keyof LeadDraft, value: string) {
    setDraft((current) => {
      const next = { ...current, [field]: value }
      if (field === 'status' && value !== 'Lost') next.lostReason = ''
      return next
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateLeadDraft(draft)
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
      <label className="field">
        <span>Name</span>
        <input
          value={draft.fullName}
          onChange={(event) => update('fullName', event.target.value)}
          autoComplete="name"
          disabled={saving}
        />
        {errors.fullName ? <FieldError message={errors.fullName} /> : null}
      </label>
      <label className="field">
        <span>Phone</span>
        <input
          type="tel"
          value={draft.phone}
          onChange={(event) => update('phone', event.target.value)}
          autoComplete="tel"
          disabled={saving}
        />
        {errors.phone ? <FieldError message={errors.phone} /> : null}
      </label>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={draft.email}
          onChange={(event) => update('email', event.target.value)}
          autoComplete="email"
          disabled={saving}
        />
        {errors.email ? <FieldError message={errors.email} /> : null}
      </label>
      <label className="field">
        <span>Course</span>
        <input
          value={draft.courseInterest}
          onChange={(event) => update('courseInterest', event.target.value)}
          disabled={saving}
        />
        {errors.courseInterest ? <FieldError message={errors.courseInterest} /> : null}
      </label>
      <label className="field">
        <span>Source</span>
        <select
          value={draft.source}
          onChange={(event) => update('source', event.target.value)}
          disabled={saving}
        >
          <option value="">Choose a source</option>
          {LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>
              {leadSourceLabel(source)}
            </option>
          ))}
        </select>
        {errors.source ? <FieldError message={errors.source} /> : null}
      </label>
      <label className="field">
        <span>Status</span>
        <select
          value={draft.status}
          onChange={(event) => update('status', event.target.value)}
          disabled={saving}
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {errors.status ? <FieldError message={errors.status} /> : null}
      </label>
      {draft.status === 'Lost' ? (
        <label className="field field-wide">
          <span>Lost reason</span>
          <input
            value={draft.lostReason}
            onChange={(event) => update('lostReason', event.target.value)}
            disabled={saving}
          />
          {errors.lostReason ? <FieldError message={errors.lostReason} /> : null}
        </label>
      ) : null}
      <label className="field field-wide">
        <span>Assignee</span>
        <select
          value={draft.assignedTo}
          onChange={(event) => update('assignedTo', event.target.value)}
          disabled={saving}
        >
          <option value="">Unassigned</option>
          {preservedAssignee ? (
            <option value={preservedAssignee.id}>{preservedAssignee.label}</option>
          ) : null}
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="field field-wide">
        <span>Notes</span>
        <textarea
          rows={4}
          value={draft.notes}
          onChange={(event) => update('notes', event.target.value)}
          disabled={saving}
        />
      </label>
      <div className="form-actions field-wide">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving' : submitLabel}
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
