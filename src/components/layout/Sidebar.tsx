import { AccountPanel } from './AccountPanel.tsx'
import { NavLinks } from './NavLinks.tsx'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <p className="brand-mark">BrightPath</p>
        <p className="brand-sub">Admissions desk</p>
        <nav aria-label="Primary">
          <NavLinks />
        </nav>
      </div>
      <AccountPanel />
    </aside>
  )
}
