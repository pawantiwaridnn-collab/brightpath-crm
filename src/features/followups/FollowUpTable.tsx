import { Link } from 'react-router-dom'
import { followUpStatusLabel, type FollowUp } from '../../types/followUp.ts'
import { formatDateTime } from '../../utils/format.ts'

type FollowUpTableProps = {
  followUps: FollowUp[]
  onComplete?: (followUp: FollowUp) => void
  onCancel?: (followUp: FollowUp) => void
}

export function FollowUpTable({ followUps, onComplete, onCancel }: FollowUpTableProps) {
  return (
    <>
      <div className="lead-table-wrap">
        <table className="lead-table">
          <thead>
            <tr>
              <th scope="col">Lead</th>
              <th scope="col">Due</th>
              <th scope="col">Note</th>
              <th scope="col">Assignee</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {followUps.map((followUp) => (
              <tr key={followUp.id}>
                <td>
                  <LeadLink followUp={followUp} />
                </td>
                <td>{formatDateTime(followUp.dueAt)}</td>
                <td className="follow-up-note">{followUp.note}</td>
                <td>{followUp.assigneeName ?? 'Assigned'}</td>
                <td>
                  <StatusText followUp={followUp} />
                </td>
                <td>
                  <RowActions followUp={followUp} onComplete={onComplete} onCancel={onCancel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lead-cards">
        {followUps.map((followUp) => (
          <article className="lead-card" key={followUp.id}>
            <p className="lead-card-name">
              <LeadLink followUp={followUp} />
            </p>
            <dl className="identity">
              <div>
                <dt>Due</dt>
                <dd>{formatDateTime(followUp.dueAt)}</dd>
              </div>
              <div>
                <dt>Note</dt>
                <dd className="follow-up-note">{followUp.note}</dd>
              </div>
              <div>
                <dt>Assignee</dt>
                <dd>{followUp.assigneeName ?? 'Assigned'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusText followUp={followUp} />
                </dd>
              </div>
            </dl>
            <RowActions followUp={followUp} onComplete={onComplete} onCancel={onCancel} />
          </article>
        ))}
      </div>
    </>
  )
}

function LeadLink({ followUp }: { followUp: FollowUp }) {
  return (
    <Link className="text-link" to={`/leads/${followUp.leadId}`}>
      {followUp.leadName ?? 'Lead'}
    </Link>
  )
}

function StatusText({ followUp }: { followUp: FollowUp }) {
  const label = followUpStatusLabel(followUp)
  const tone = label.toLowerCase()
  return <span className={`follow-up-${tone}`}>{label}</span>
}

function RowActions({
  followUp,
  onComplete,
  onCancel,
}: {
  followUp: FollowUp
  onComplete?: (followUp: FollowUp) => void
  onCancel?: (followUp: FollowUp) => void
}) {
  if (followUp.status !== 'pending' || (!onComplete && !onCancel)) return <span className="muted">None</span>
  return (
    <div className="row-actions">
      {onComplete ? (
        <button type="button" onClick={() => onComplete(followUp)}>
          Complete
        </button>
      ) : null}
      {onCancel ? (
        <button type="button" className="button-quiet" onClick={() => onCancel(followUp)}>
          Cancel
        </button>
      ) : null}
    </div>
  )
}
