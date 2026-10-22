import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { ActivityList } from '../features/activities/ActivityList.tsx'
import { LeadFollowUpSection } from '../features/followups/LeadFollowUpSection.tsx'
import { LeadFailure } from '../features/leads/LeadFailure.tsx'
import { assigneeLabel, leadFailureTitle } from '../features/leads/leadValues.ts'
import { getLead, setLeadArchived } from '../services/leadService.ts'
import { leadSourceLabel, type Lead } from '../types/lead.ts'
import { formatDateTime } from '../utils/format.ts'

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; lead: Lead }
  | { status: 'error'; title: string; message: string }

export function LeadDetailPage() {
  const { leadId = '' } = useParams()
  const [loadedId, setLoadedId] = useState(leadId)
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<'archive' | 'restore' | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  if (loadedId !== leadId) {
    setLoadedId(leadId)
    setState({ status: 'loading' })
    setPending(null)
    setActionError(null)
  }

  useEffect(() => {
    let cancelled = false
    void getLead(leadId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setState({
          status: 'error',
          title: leadFailureTitle(result.kind),
          message: result.message,
        })
        return
      }
      setState({ status: 'ready', lead: result.data })
    })
    return () => {
      cancelled = true
    }
  }, [leadId, revision])

  useEffect(() => {
    if (!pending) return
    dialogRef.current?.showModal()
  }, [pending])

  async function confirmPending() {
    if (state.status !== 'ready' || !pending) return
    setSaving(true)
    setActionError(null)
    const result = await setLeadArchived(state.lead.id, pending === 'archive')
    if (!result.ok) {
      setActionError(result.message)
      setSaving(false)
      dialogRef.current?.close()
      setPending(null)
      return
    }
    const next = await getLead(state.lead.id)
    setSaving(false)
    dialogRef.current?.close()
    setPending(null)
    if (!next.ok) {
      setState({
        status: 'error',
        title: leadFailureTitle(next.kind),
        message: next.message,
      })
      return
    }
    setState({ status: 'ready', lead: next.data })
  }

  if (state.status === 'loading') {
    return (
      <>
        <header className="page-header">
          <h1>Lead</h1>
        </header>
        <LoadingState label="Loading this lead." />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <header className="page-header">
          <h1>Lead</h1>
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

  const { lead } = state
  const backTo = lead.archivedAt ? '/leads?view=archived' : '/leads'

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <p>
              <Link className="text-link" to={backTo}>
                Back to leads
              </Link>
            </p>
            <h1>{lead.fullName}</h1>
            {lead.archivedAt ? (
              <p>Archived {formatDateTime(lead.archivedAt)}. Hidden from the working list.</p>
            ) : (
              <p>Enquiry record.</p>
            )}
          </div>
          <div className="form-actions">
            <Link className="button-link" to={`/leads/${lead.id}/edit`}>
              Edit
            </Link>
            {lead.archivedAt ? (
              <button type="button" className="button-quiet" onClick={() => setPending('restore')}>
                Restore
              </button>
            ) : (
              <button type="button" className="button-quiet" onClick={() => setPending('archive')}>
                Archive
              </button>
            )}
          </div>
        </div>
      </header>
      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}
      <section className="panel" aria-labelledby="lead-details">
        <h2 id="lead-details">Details</h2>
        <dl className="identity">
          <div>
            <dt>Phone</dt>
            <dd>{lead.phone}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{lead.email ?? 'None'}</dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>{lead.courseInterest}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{leadSourceLabel(lead.source)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <StatusBadge status={lead.status} />
            </dd>
          </div>
          {lead.lostReason ? (
            <div>
              <dt>Lost reason</dt>
              <dd>{lead.lostReason}</dd>
            </div>
          ) : null}
          <div>
            <dt>Assignee</dt>
            <dd>{assigneeLabel(lead)}</dd>
          </div>
          <div>
            <dt>Next follow-up</dt>
            <dd>{lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'None'}</dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>{lead.notes ?? 'None'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(lead.createdAt)}</dd>
          </div>
          <div>
            <dt>Created by</dt>
            <dd>{lead.creatorName ?? 'Unavailable'}</dd>
          </div>
        </dl>
      </section>
      <LeadFollowUpSection
        leadId={lead.id}
        archived={Boolean(lead.archivedAt)}
        onChanged={() => setRevision((value) => value + 1)}
      />
      <ActivityList leadId={lead.id} revision={revision} />
      {pending ? (
        <dialog
          ref={dialogRef}
          className="confirm-dialog"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-description"
          onClose={() => {
            if (!saving) setPending(null)
          }}
        >
          <h2 id="confirm-title">
            {pending === 'archive' ? 'Archive this lead?' : 'Restore this lead?'}
          </h2>
          <p id="confirm-description">
            {pending === 'archive'
              ? 'It leaves the working list and stays in the database.'
              : 'It returns to the working list.'}
          </p>
          <div className="form-actions">
            <button type="button" disabled={saving} onClick={() => void confirmPending()}>
              {saving ? 'Saving' : pending === 'archive' ? 'Archive' : 'Restore'}
            </button>
            <button
              type="button"
              className="button-quiet"
              disabled={saving}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
