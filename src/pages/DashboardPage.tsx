import { useEffect, useState } from 'react'
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics.tsx'
import { LoadingState } from '../components/ui/LoadingState.tsx'
import {
  loadFollowUpBoard,
  loadLeadMetrics,
  loadRecentLeads,
  type DashboardResult,
} from '../services/dashboardService.ts'
import type { FollowUpBoard, LeadMetrics, RecentLeads } from '../types/dashboard.ts'

type BoardState =
  | { status: 'loading' }
  | {
      status: 'ready'
      metrics: DashboardResult<LeadMetrics>
      recent: DashboardResult<RecentLeads>
      followUps: DashboardResult<FollowUpBoard>
    }

export function DashboardPage() {
  const [state, setState] = useState<BoardState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    void Promise.all([loadLeadMetrics(), loadRecentLeads(), loadFollowUpBoard(now)]).then(
      ([metrics, recent, followUps]) => {
        if (cancelled) return
        setState({ status: 'ready', metrics, recent, followUps })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Working enquiries and follow-ups you can read.</p>
      </header>
      {state.status === 'loading' ? <LoadingState label="Loading the dashboard." /> : null}
      {state.status === 'ready' ? (
        <DashboardMetrics metrics={state.metrics} recent={state.recent} followUps={state.followUps} />
      ) : null}
    </>
  )
}
