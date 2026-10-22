import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { leadSourceLabel, type Lead } from '../../types/lead.ts'
import { formatDateTime } from '../../utils/format.ts'
import { assigneeLabel } from './leadValues.ts'

type LeadTableProps = {
  leads: Lead[]
}

export function LeadTable({ leads }: LeadTableProps) {
  return (
    <>
      <div className="lead-table-wrap">
        <table className="lead-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Contact</th>
              <th scope="col">Course</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Assignee</th>
              <th scope="col">Next follow-up</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link className="text-link" to={`/leads/${lead.id}`}>
                    {lead.fullName}
                  </Link>
                </td>
                <td>
                  <Contact lead={lead} />
                </td>
                <td>{lead.courseInterest}</td>
                <td>{leadSourceLabel(lead.source)}</td>
                <td>
                  <StatusBadge status={lead.status} />
                </td>
                <td>{assigneeLabel(lead)}</td>
                <td>{lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'None'}</td>
                <td>{formatDateTime(lead.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lead-cards">
        {leads.map((lead) => (
          <article className="lead-card" key={lead.id}>
            <p className="lead-card-name">
              <Link className="text-link" to={`/leads/${lead.id}`}>
                {lead.fullName}
              </Link>
            </p>
            <dl className="identity">
              <div>
                <dt>Contact</dt>
                <dd>
                  <Contact lead={lead} />
                </dd>
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
              <div>
                <dt>Assignee</dt>
                <dd>{assigneeLabel(lead)}</dd>
              </div>
              <div>
                <dt>Next follow-up</dt>
                <dd>{lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'None'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(lead.createdAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}

function Contact({ lead }: { lead: Lead }) {
  return (
    <>
      <div>{lead.phone}</div>
      {lead.email ? <div className="muted">{lead.email}</div> : null}
    </>
  )
}
