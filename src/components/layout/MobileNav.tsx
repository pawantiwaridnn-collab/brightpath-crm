import { AccountPanel } from './AccountPanel.tsx'
import { NavLinks } from './NavLinks.tsx'

export function MobileNav() {
  return (
    <header className="mobile-nav">
      <p className="brand-mark">BrightPath CRM</p>
      <nav aria-label="Primary mobile">
        <NavLinks />
      </nav>
      <AccountPanel />
    </header>
  )
}
