import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell.tsx'
import { AuthGate } from './features/auth/AuthGate.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { FollowUpEditorPage } from './pages/FollowUpEditorPage.tsx'
import { FollowUpsPage } from './pages/FollowUpsPage.tsx'
import { LeadDetailPage } from './pages/LeadDetailPage.tsx'
import { LeadEditorPage } from './pages/LeadEditorPage.tsx'
import { LeadsPage } from './pages/LeadsPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { ReportsPage } from './pages/ReportsPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/new" element={<LeadEditorPage />} />
            <Route path="leads/:leadId" element={<LeadDetailPage />} />
            <Route path="leads/:leadId/edit" element={<LeadEditorPage />} />
            <Route path="leads/:leadId/follow-ups/new" element={<FollowUpEditorPage />} />
            <Route path="follow-ups" element={<FollowUpsPage />} />
            <Route path="follow-ups/new" element={<FollowUpEditorPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthGate>
    </BrowserRouter>
  )
}
