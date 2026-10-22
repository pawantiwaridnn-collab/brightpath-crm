import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { LoadingState } from '../../components/ui/LoadingState.tsx'
import { LeadFailure } from '../leads/LeadFailure.tsx'
import { FollowUpTable } from './FollowUpTable.tsx'
import { followUpFailureTitle } from './followUpValues.ts'
import { cancelFollowUp, completeFollowUp, listFollowUpsForLead } from '../../services/followUpService.ts'
import type { FollowUp } from '../../types/followUp.ts'

type SectionState =
  | { status: 'loading' }
  | { status: 'ready'; followUps: FollowUp[] }
  | { status: 'error'; title: string; message: string }

type PendingAction = {
  followUp: FollowUp
  kind: 'complete' | 'cancel'
}

type LeadFollowUpSectionProps = {
  leadId: string
  archived: boolean
  onChanged: () => void
}

export function LeadFollowUpSection({ leadId, archived, onChanged }: LeadFollowUpSectionProps) {
  const [loadedId, setLoadedId] = useState(leadId)
  const [state, setState] = useState<SectionState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<PendingAction | null>(null)
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
    void listFollowUpsForLead(leadId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setState({
          status: 'error',
          title: followUpFailureTitle(result.kind),
          message: result.message,
        })
        return
      }
      setState({ status: 'ready', followUps: result.data })
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
      if (result.saved) {
        setRevision((value) => value + 1)
        onChanged()
      }
      return
    }
    setRevision((value) => value + 1)
    onChanged()
  }

  return (
    <section className="panel" aria-labelledby="lead-follow-ups">
      <div className="page-header-row">
        <h2 id="lead-follow-ups">Follow-ups</h2>
        {archived ? null : (
          <Link className="button-link" to={`/leads/${leadId}/follow-ups/new`}>
            Schedule follow-up
          </Link>
        )}
      </div>
      {archived ? <p className="session-notice">Restore this lead before scheduling a follow-up.</p> : null}
      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}
      {state.status === 'loading' ? <LoadingState label="Loading follow-ups." /> : null}
      {state.status === 'error' ? <LeadFailure title={state.title} message={state.message} /> : null}
      {state.status === 'ready' && state.followUps.length === 0 ? (
        <EmptyState title="No follow-ups yet" description="Schedule a call or visit for this enquiry." />
      ) : null}
      {state.status === 'ready' && state.followUps.length > 0 ? (
        <FollowUpTable
          followUps={state.followUps}
          onComplete={(followUp) => setPending({ followUp, kind: 'complete' })}
          onCancel={(followUp) => setPending({ followUp, kind: 'cancel' })}
        />
      ) : null}
      {pending ? (
        <dialog
          ref={dialogRef}
          className="confirm-dialog"
          aria-labelledby="lead-follow-up-confirm-title"
          aria-describedby="lead-follow-up-confirm-description"
          onClose={() => {
            if (!saving) setPending(null)
          }}
        >
          <h2 id="lead-follow-up-confirm-title">
            {pending.kind === 'complete' ? 'Mark this follow-up complete?' : 'Cancel this follow-up?'}
          </h2>
          <p id="lead-follow-up-confirm-description">
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
    </section>
  )
}
