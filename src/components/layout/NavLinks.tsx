import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../types/navigation.ts'

export function NavLinks() {
  return (
    <ul className="nav-list">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link-active' : 'nav-link'
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
