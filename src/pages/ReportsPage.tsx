import { useEffect, useState } from 'react'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import { ReportsSummary } from '../features/reports/ReportsSummary.tsx'
import {
  loadFollowUpBoard,
  loadLeadMetrics,
  type DashboardResult,
} from '../services/dashboardService.ts'
import type { FollowUpBoard, LeadMetrics } from '../types/dashboard.ts'

type ReportState =
  | { status: 'loading' }
  | {
      status: 'ready'
      metrics: DashboardResult<LeadMetrics>
      followUps: DashboardResult<FollowUpBoard>
    }

export function ReportsPage() {
  const [state, setState] = useState<ReportState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    void Promise.all([loadLeadMetrics(), loadFollowUpBoard(now)]).then(([metrics, followUps]) => {
      if (cancelled) return
      setState({ status: 'ready', metrics, followUps })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <header className="page-header">
        <h1>Reports</h1>
        <p>Status and source summaries use the same definitions as the dashboard.</p>
      </header>
      {state.status === 'loading' ? <LoadingState label="Loading the report." /> : null}
      {state.status === 'ready' ? (
        <ReportsSummary metrics={state.metrics} followUps={state.followUps} />
      ) : null}
    </>
  )
}
