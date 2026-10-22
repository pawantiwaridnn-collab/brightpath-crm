import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { LoadingState } from '../../components/ui/LoadingState.tsx'
import { LeadFailure } from '../leads/LeadFailure.tsx'
import { listActivities } from '../../services/activityService.ts'
import type { Activity } from '../../types/activity.ts'
import { formatDateTime } from '../../utils/format.ts'
import { activityFailureTitle, activityLabel } from './activityValues.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; activities: Activity[] }
  | { status: 'error'; title: string; message: string }

type ActivityListProps = {
  leadId: string
  revision: number
}

export function ActivityList({ leadId, revision }: ActivityListProps) {
  const loadKey = `${leadId}:${revision}`
  const [loadedKey, setLoadedKey] = useState(loadKey)
  const [state, setState] = useState<ListState>({ status: 'loading' })

  if (loadedKey !== loadKey) {
    setLoadedKey(loadKey)
    setState({ status: 'loading' })
  }

  useEffect(() => {
    let cancelled = false
    void listActivities(leadId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setState({
          status: 'error',
          title: activityFailureTitle(result.kind),
          message: result.message,
        })
        return
      }
      setState({ status: 'ready', activities: result.data })
    })
    return () => {
      cancelled = true
    }
  }, [leadId, revision])

  return (
    <section className="panel" aria-labelledby="lead-history">
      <h2 id="lead-history">History</h2>
      {state.status === 'loading' ? <LoadingState label="Loading history." /> : null}
      {state.status === 'error' ? <LeadFailure title={state.title} message={state.message} /> : null}
      {state.status === 'ready' && state.activities.length === 0 ? (
        <EmptyState title="No activity yet" description="Creating, status changes, notes, and completed follow-ups appear here." />
      ) : null}
      {state.status === 'ready' && state.activities.length > 0 ? (
        <div className="history-list">
          {state.activities.map((activity) => (
            <article className="history-item" key={activity.id}>
              <p className="history-label">{activityLabel(activity.activityType)}</p>
              <p>{activity.description}</p>
              <p className="muted">
                {activity.actorName ?? 'Unavailable'}, {formatDateTime(activity.createdAt)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
