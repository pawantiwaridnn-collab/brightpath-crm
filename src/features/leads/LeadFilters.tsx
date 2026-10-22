import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LEAD_STATUSES } from '../../types/navigation.ts'
import { LEAD_SOURCES, leadSourceLabel } from '../../types/lead.ts'
import type { Profile } from '../../types/profile.ts'

type LeadFilterDraft = {
  search: string
  status: string
  source: string
  assignee: string
}

type LeadFiltersProps = {
  search: string
  status: string
  source: string
  assignee: string
  archived: boolean
  profiles: Profile[]
  workingTo: string
  archivedTo: string
  onApply: (draft: LeadFilterDraft) => void
  onReset: () => void
}

export function LeadFilters({
  search,
  status,
  source,
  assignee,
  archived,
  profiles,
  workingTo,
  archivedTo,
  onApply,
  onReset,
}: LeadFiltersProps) {
  const [draft, setDraft] = useState<LeadFilterDraft>({ search, status, source, assignee })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply(draft)
  }

  return (
    <div className="lead-tools">
      <div className="view-switch">
        <Link to={workingTo} aria-current={archived ? undefined : 'page'}>
          Working
        </Link>
        <Link to={archivedTo} aria-current={archived ? 'page' : undefined}>
          Archived
        </Link>
      </div>
      <form className="filters" onSubmit={onSubmit}>
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            value={draft.search}
            onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
            placeholder="Name, phone, email, or course"
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">Any status</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Source</span>
          <select
            value={draft.source}
            onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}
          >
            <option value="">Any source</option>
            {LEAD_SOURCES.map((item) => (
              <option key={item} value={item}>
                {leadSourceLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Assignee</span>
          <select
            value={draft.assignee}
            onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))}
          >
            <option value="">Any assignee</option>
            <option value="unassigned">Unassigned</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button type="submit">Apply</button>
          <button type="button" className="button-quiet" onClick={onReset}>
            Reset
          </button>
        </div>
      </form>
    </div>
  )
}
