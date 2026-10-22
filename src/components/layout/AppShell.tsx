import { Outlet, useLocation } from 'react-router-dom'
import { SkipLink } from '../ui/SkipLink.tsx'
import { MobileNav } from './MobileNav.tsx'
import { Sidebar } from './Sidebar.tsx'

export function AppShell() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <SkipLink />
      <Sidebar />
      <div className="app-main">
        <MobileNav />
        <main className="page" id="main" tabIndex={-1}>
          <div key={location.pathname} className="page-stage">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
