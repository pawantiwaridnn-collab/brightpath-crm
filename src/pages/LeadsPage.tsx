import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import { useAuth } from '../features/auth/auth-context.ts'
import { LeadFailure } from '../features/leads/LeadFailure.tsx'
import { LeadFilters } from '../features/leads/LeadFilters.tsx'
import { LeadTable } from '../features/leads/LeadTable.tsx'
import { leadFailureTitle } from '../features/leads/leadValues.ts'
import { listLeads, type LeadListQuery, type LeadPage } from '../services/leadService.ts'
import { listProfiles } from '../services/profileService.ts'
import { isLeadSource, isLeadStatus } from '../types/lead.ts'
import type { Profile } from '../types/profile.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; page: LeadPage }
  | { status: 'error'; title: string; message: string }

function readQuery(params: URLSearchParams): LeadListQuery {
  const status = params.get('status') ?? ''
  const source = params.get('source') ?? ''
  const page = Number(params.get('page') ?? '1')
  return {
    search: params.get('q') ?? '',
    status: isLeadStatus(status) ? status : null,
    source: isLeadSource(source) ? source : null,
    assignee: params.get('assignee'),
    archived: params.get('view') === 'archived',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

function writeQuery(query: LeadListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.search.trim()) params.set('q', query.search.trim())
  if (query.status) params.set('status', query.status)
  if (query.source) params.set('source', query.source)
  if (query.assignee) params.set('assignee', query.assignee)
  if (query.archived) params.set('view', 'archived')
  if (query.page > 1) params.set('page', String(query.page))
  return params
}

export function LeadsPage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const query = readQuery(params)
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profileNote, setProfileNote] = useState<string | null>(null)
  const queryKey = params.toString()
  const [loadedKey, setLoadedKey] = useState(queryKey)
  if (loadedKey !== queryKey) {
    setLoadedKey(queryKey)
    setState({ status: 'loading' })
  }

  useEffect(() => {
    let cancelled = false
    void listProfiles()
      .then((rows) => {
        if (!cancelled) setProfiles(rows)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        const message = caught instanceof Error ? caught.message : 'Assignee names could not be loaded.'
        setProfileNote(message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void listLeads(readQuery(new URLSearchParams(queryKey))).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setState({
          status: 'error',
          title: leadFailureTitle(result.kind),
          message: result.message,
        })
        return
      }
      setState({ status: 'ready', page: result.data })
    })
    return () => {
      cancelled = true
    }
  }, [queryKey])

  const assigneeOptions = useMemo(() => {
    if (!profile) return profiles
    if (profiles.some((item) => item.id === profile.id)) return profiles
    return [profile, ...profiles]
  }, [profile, profiles])

  function replaceQuery(next: LeadListQuery) {
    setParams(writeQuery(next))
  }

  const filtered =
    query.search.trim() !== '' || query.status !== null || query.source !== null || query.assignee !== null
  const workingTo = `?${writeQuery({ ...query, archived: false, page: 1 }).toString()}`
  const archivedTo = `?${writeQuery({ ...query, archived: true, page: 1 }).toString()}`

  let body = <LoadingState label="Loading leads." />
  if (state.status === 'error') {
    body = <LeadFailure title={state.title} message={state.message} />
  } else if (state.status === 'ready') {
    const { leads, total, page, pageSize } = state.page
    const lastPage = Math.max(1, Math.ceil(total / pageSize))
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, total)
    body = (
      <>
        {leads.length === 0 ? (
          <EmptyState
            title={
              filtered
                ? 'No leads match these filters'
                : query.archived
                  ? 'No archived leads'
                  : 'No leads yet'
            }
            description={
              filtered
                ? 'Reset the search or choose different filters.'
                : query.archived
                  ? 'Archived enquiries will appear here.'
                  : 'Use New lead to add an enquiry.'
            }
          />
        ) : (
          <LeadTable leads={leads} />
        )}
        {total > 0 ? (
          <div className="pager">
            <p>
              {start}–{end} of {total}
            </p>
            <div className="pager-actions">
              <button
                type="button"
                className="button-quiet"
                disabled={page <= 1}
                onClick={() => replaceQuery({ ...query, page: page - 1 })}
              >
                Previous
              </button>
              <button
                type="button"
                className="button-quiet"
                disabled={page >= lastPage}
                onClick={() => replaceQuery({ ...query, page: page + 1 })}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Leads</h1>
            <p>Enquiry records for BrightPath Academy.</p>
          </div>
          <Link className="button-link" to="/leads/new">
            New lead
          </Link>
        </div>
      </header>
      <LeadFilters
        key={`${query.search}|${query.status ?? ''}|${query.source ?? ''}|${query.assignee ?? ''}`}
        search={query.search}
        status={query.status ?? ''}
        source={query.source ?? ''}
        assignee={query.assignee ?? ''}
        archived={query.archived}
        profiles={assigneeOptions}
        workingTo={workingTo === '?' ? '/leads' : `/leads${workingTo}`}
        archivedTo={`/leads${archivedTo}`}
        onApply={(draft) =>
          replaceQuery({
            search: draft.search,
            status: isLeadStatus(draft.status) ? draft.status : null,
            source: isLeadSource(draft.source) ? draft.source : null,
            assignee: draft.assignee || null,
            archived: query.archived,
            page: 1,
          })
        }
        onReset={() =>
          replaceQuery({
            search: '',
            status: null,
            source: null,
            assignee: null,
            archived: query.archived,
            page: 1,
          })
        }
      />
      {profileNote ? <p className="form-error">{profileNote}</p> : null}
      {body}
    </>
  )
}
