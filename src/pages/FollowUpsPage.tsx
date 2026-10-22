import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import { FollowUpTable } from '../features/followups/FollowUpTable.tsx'
import { followUpFailureTitle } from '../features/followups/followUpValues.ts'
import { LeadFailure } from '../features/leads/LeadFailure.tsx'
import {
  cancelFollowUp,
  completeFollowUp,
  listFollowUps,
  type FollowUpPage,
} from '../services/followUpService.ts'
import { isFollowUpView, type FollowUp, type FollowUpView } from '../types/followUp.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; page: FollowUpPage }
  | { status: 'error'; title: string; message: string }

type PendingAction = {
  followUp: FollowUp
  kind: 'complete' | 'cancel'
}

const emptyCopy: Record<FollowUpView, { title: string; description: string }> = {
  upcoming: {
    title: 'No upcoming follow-ups',
    description: 'Pending follow-ups that are still due appear here.',
  },
  overdue: {
    title: 'No overdue follow-ups',
    description: 'Pending follow-ups whose due time has passed appear here.',
  },
  closed: {
    title: 'No closed follow-ups',
    description: 'Completed and cancelled follow-ups appear here.',
  },
}

function readView(params: URLSearchParams): { view: FollowUpView; page: number } {
  const rawView = params.get('view') ?? 'upcoming'
  const page = Number(params.get('page') ?? '1')
  return {
    view: isFollowUpView(rawView) ? rawView : 'upcoming',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

function viewHref(view: FollowUpView, page = 1): string {
  const params = new URLSearchParams()
  if (view !== 'upcoming') params.set('view', view)
  if (page > 1) params.set('page', String(page))
  const text = params.toString()
  return text ? `/follow-ups?${text}` : '/follow-ups'
}

export function FollowUpsPage() {
  const [params, setParams] = useSearchParams()
  const { view, page } = readView(params)
  const queryKey = `${view}:${page}`
  const [loadedKey, setLoadedKey] = useState(queryKey)
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  if (loadedKey !== queryKey) {
    setLoadedKey(queryKey)
    setState({ status: 'loading' })
    setActionError(null)
  }

  useEffect(() => {
    let cancelled = false
    void listFollowUps(view, page).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setState({
          status: 'error',
          title: followUpFailureTitle(result.kind),
          message: result.message,
        })
        return
      }
      setState({ status: 'ready', page: result.data })
    })
    return () => {
      cancelled = true
    }
  }, [queryKey, revision, view, page])

  useEffect(() => {
    if (!pending) return
    dialogRef.current?.showModal()
  }, [pending])

  async function confirmPending() {
    if (!pending) return
    setSaving(true)
    setActionError(null)
    const result =
      pending.kind === 'complete'
        ? await completeFollowUp(pending.followUp.id)
        : await cancelFollowUp(pending.followUp.id)
    setSaving(false)
    dialogRef.current?.close()
    setPending(null)
    if (!result.ok) {
      setActionError(result.message)
      if (result.saved) setRevision((value) => value + 1)
      return
    }
    setRevision((value) => value + 1)
  }

  let body = <LoadingState label="Loading follow-ups." />
  if (state.status === 'error') {
    body = <LeadFailure title={state.title} message={state.message} />
  } else if (state.status === 'ready') {
    const { followUps, total, page: currentPage, pageSize } = state.page
    const lastPage = Math.max(1, Math.ceil(total / pageSize))
    const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, total)
    const copy = emptyCopy[view]
    body = (
      <>
        {followUps.length === 0 ? (
          <EmptyState title={copy.title} description={copy.description} />
        ) : (
          <FollowUpTable
            followUps={followUps}
            onComplete={(followUp) => setPending({ followUp, kind: 'complete' })}
            onCancel={(followUp) => setPending({ followUp, kind: 'cancel' })}
          />
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
                disabled={currentPage <= 1}
                onClick={() => setParams(pageParams(view, currentPage - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="button-quiet"
                disabled={currentPage >= lastPage}
                onClick={() => setParams(pageParams(view, currentPage + 1))}
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
            <h1>Follow-ups</h1>
            <p>Scheduled calls and visits for open enquiries.</p>
          </div>
          <Link className="button-link" to="/follow-ups/new">
            Schedule follow-up
          </Link>
        </div>
      </header>
      <div className="lead-tools">
        <div className="view-switch">
          <Link to={viewHref('upcoming')} aria-current={view === 'upcoming' ? 'page' : undefined}>
            Upcoming
          </Link>
          <Link to={viewHref('overdue')} aria-current={view === 'overdue' ? 'page' : undefined}>
            Overdue
          </Link>
          <Link to={viewHref('closed')} aria-current={view === 'closed' ? 'page' : undefined}>
            Closed
          </Link>
        </div>
      </div>
      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}
      {body}
      {pending ? (
        <dialog
          ref={dialogRef}
          className="confirm-dialog"
          aria-labelledby="follow-up-confirm-title"
          aria-describedby="follow-up-confirm-description"
          onClose={() => {
            if (!saving) setPending(null)
          }}
        >
          <h2 id="follow-up-confirm-title">
            {pending.kind === 'complete' ? 'Mark this follow-up complete?' : 'Cancel this follow-up?'}
          </h2>
          <p id="follow-up-confirm-description">
            {pending.kind === 'complete'
              ? 'It leaves Upcoming and Overdue and stays in Closed.'
              : 'It stays in the database and moves to Closed.'}
          </p>
          <div className="form-actions">
            <button type="button" disabled={saving} onClick={() => void confirmPending()}>
              {saving ? 'Saving' : pending.kind === 'complete' ? 'Complete' : 'Cancel follow-up'}
            </button>
            <button
              type="button"
              className="button-quiet"
              disabled={saving}
              onClick={() => dialogRef.current?.close()}
            >
              Keep it
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  )
}

function pageParams(view: FollowUpView, page: number): URLSearchParams {
  const params = new URLSearchParams()
  if (view !== 'upcoming') params.set('view', view)
  if (page > 1) params.set('page', String(page))
  return params
}
