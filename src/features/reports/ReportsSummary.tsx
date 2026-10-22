import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { LeadFailure } from '../leads/LeadFailure.tsx'
import type { DashboardResult } from '../../services/dashboardService.ts'
import type { FollowUpBoard, LeadMetrics } from '../../types/dashboard.ts'
import { leadSourceLabel } from '../../types/lead.ts'
import {
  SOURCE_ORDER,
  STATUS_ORDER,
  conversionRate,
} from '../dashboard/dashboardValues.ts'

type ReportsSummaryProps = {
  metrics: DashboardResult<LeadMetrics>
  followUps: DashboardResult<FollowUpBoard>
}

export function ReportsSummary({ metrics, followUps }: ReportsSummaryProps) {
  return (
    <>
      {metrics.ok || followUps.ok ? (
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
      ) : null}
      {metrics.ok ? (
        <Breakdowns metrics={metrics.data} />
      ) : (
        <LeadFailure title={reportFailureTitle(metrics.kind)} message={metrics.message} />
      )}
      {followUps.ok ? null : (
        <LeadFailure title={reportFailureTitle(followUps.kind)} message={followUps.message} />
      )}
    </>
  )
}

function reportFailureTitle(kind: 'permission' | 'unavailable' | 'invalid' | 'server'): string {
  if (kind === 'permission') return 'You do not have access'
  if (kind === 'unavailable') return 'This report is not available'
  if (kind === 'invalid') return 'The report was rejected'
  return 'The request failed'
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
      <section className="panel" aria-labelledby="report-status">
        <h2 id="report-status">By status</h2>
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
      <section className="panel" aria-labelledby="report-source">
        <h2 id="report-source">By source</h2>
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

function MetricLink({ to, value, label }: { to: string; value: string; label: string }) {
  return (
    <Link className="metric-card" to={to}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </Link>
  )
}
