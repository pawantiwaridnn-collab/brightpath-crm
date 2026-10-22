import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { LeadFailure } from '../leads/LeadFailure.tsx'
import type { DashboardResult } from '../../services/dashboardService.ts'
import {
  DASHBOARD_PREVIEW_LIMIT,
  type FollowUpBoard,
  type FollowUpPreview,
  type LeadMetrics,
  type RecentLeads,
} from '../../types/dashboard.ts'
import { leadSourceLabel } from '../../types/lead.ts'
import { formatDateTime } from '../../utils/format.ts'
import {
  SOURCE_ORDER,
  STATUS_ORDER,
  conversionRate,
  dashboardFailureTitle,
} from './dashboardValues.ts'

type DashboardMetricsProps = {
  metrics: DashboardResult<LeadMetrics>
  recent: DashboardResult<RecentLeads>
  followUps: DashboardResult<FollowUpBoard>
}

export function DashboardMetrics({ metrics, recent, followUps }: DashboardMetricsProps) {
  return (
    <>
      <div className="metric-grid">
        {metrics.ok ? <LeadCards metrics={metrics.data} /> : null}
        {followUps.ok ? (
          <MetricLink
            to="/follow-ups?view=overdue"
            value={String(followUps.data.overdueCount)}
            label="Overdue follow-ups"
          />
        ) : null}
      </div>
      {metrics.ok ? <Breakdowns metrics={metrics.data} /> : (
        <LeadFailure title={dashboardFailureTitle(metrics.kind)} message={metrics.message} />
      )}
      <section aria-labelledby="recent-leads">
        <SectionHeading
          id="recent-leads"
          title="Recent leads"
          more={
            recent.ok && recent.data.total > DASHBOARD_PREVIEW_LIMIT
              ? { to: '/leads', label: 'All leads' }
              : null
          }
        />
        {!recent.ok ? (
          <LeadFailure title={dashboardFailureTitle(recent.kind)} message={recent.message} />
        ) : recent.data.leads.length === 0 ? (
          <EmptyState title="No leads yet" description="New enquiries will appear here." />
        ) : (
          <ul className="board-list">
            {recent.data.leads.map((lead) => (
              <li key={lead.id}>
                <Link className="text-link" to={`/leads/${lead.id}`}>
                  {lead.fullName}
                </Link>
                <StatusBadge status={lead.status} />
                <span className="muted">{formatDateTime(lead.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {followUps.ok ? (
        <>
          <FollowUpSection
            id="upcoming-follow-ups"
            title="Upcoming follow-ups"
            rows={followUps.data.upcoming}
            total={followUps.data.upcomingCount}
            more={{ to: '/follow-ups', label: 'All upcoming' }}
            emptyTitle="No upcoming follow-ups"
            emptyDescription="Pending follow-ups that are still due appear here."
          />
          <FollowUpSection
            id="overdue-follow-ups"
            title="Overdue follow-ups"
            rows={followUps.data.overdue}
            total={followUps.data.overdueCount}
            more={{ to: '/follow-ups?view=overdue', label: 'All overdue' }}
            emptyTitle="No overdue follow-ups"
            emptyDescription="Pending follow-ups whose due time has passed appear here."
          />
        </>
      ) : (
        <LeadFailure title={dashboardFailureTitle(followUps.kind)} message={followUps.message} />
      )}
    </>
  )
}

function LeadCards({ metrics }: { metrics: LeadMetrics }) {
  const rate = conversionRate(metrics.byStatus.Converted, metrics.total)
  return (
    <>
      <MetricLink to="/leads" value={String(metrics.total)} label="Total leads" />
      <MetricLink to="/leads?status=New" value={String(metrics.byStatus.New)} label="New leads" />
      <MetricLink
        to="/leads?status=Converted"
        value={String(metrics.byStatus.Converted)}
        label="Converted leads"
      />
      <div className="metric-card">
        <p className="metric-value">{rate}%</p>
        <p className="metric-label">Conversion rate</p>
        <p className="muted">Converted divided by total leads, times 100.</p>
      </div>
    </>
  )
}

function Breakdowns({ metrics }: { metrics: LeadMetrics }) {
  return (
    <div className="breakdown-grid">
      <section className="panel" aria-labelledby="status-breakdown">
        <h2 id="status-breakdown">By status</h2>
        <ul className="breakdown">
          {STATUS_ORDER.map((status) => (
            <li key={status}>
              <Link className="breakdown-count" to={`/leads?status=${status}`}>
                <StatusBadge status={status} />{' '}
                <span className="text-link">{metrics.byStatus[status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel" aria-labelledby="source-breakdown">
        <h2 id="source-breakdown">By source</h2>
        <ul className="breakdown">
          {SOURCE_ORDER.map((source) => (
            <li key={source}>
              <Link className="breakdown-count" to={`/leads?source=${source}`}>
                <span>{leadSourceLabel(source)}</span>{' '}
                <span className="text-link">{metrics.bySource[source]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function FollowUpSection({
  id,
  title,
  rows,
  total,
  more,
  emptyTitle,
  emptyDescription,
}: {
  id: string
  title: string
  rows: FollowUpPreview[]
  total: number
  more: { to: string; label: string }
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <section aria-labelledby={id}>
      <SectionHeading id={id} title={title} more={total > DASHBOARD_PREVIEW_LIMIT ? more : null} />
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="board-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link className="text-link" to={`/leads/${row.leadId}`}>
                {row.leadName ?? 'Lead'}
              </Link>
              <span>{formatDateTime(row.dueAt)}</span>
              <span className="follow-up-note">{row.note}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SectionHeading({
  id,
  title,
  more,
}: {
  id: string
  title: string
  more: { to: string; label: string } | null
}) {
  return (
    <div className="section-heading">
      <h2 id={id}>{title}</h2>
      {more ? (
        <Link className="text-link" to={more.to}>
          {more.label}
        </Link>
      ) : null}
    </div>
  )
}

function MetricLink({ to, value, label }: { to: string; value: string; label: string }) {
  return (
    <Link className="metric-card" to={to}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </Link>
  )
}
