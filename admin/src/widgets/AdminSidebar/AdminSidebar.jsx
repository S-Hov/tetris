import { NavLink } from 'react-router-dom'
import { adminNavigation } from '@/shared/config/adminNavigation.js'
import { AdminIcon } from '@/shared/ui/AdminIcon.jsx'
import './AdminSidebar.css'

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar" aria-label="Админ-навигация">
      <NavLink className="admin-sidebar__brand" to="/dashboard" title="PVP Tetris Admin">
        <span className="admin-sidebar__mark">T</span>
        <span className="admin-sidebar__brand-text">PVP Tetris</span>
      </NavLink>

      <nav className="admin-sidebar__nav">
        {adminNavigation.map((section) => (
          <div className="admin-sidebar__group" key={section.key}>
            <NavLink
              className={({ isActive }) => `admin-sidebar__section ${isActive ? 'is-active' : ''}`}
              to={section.items[0].path}
              title={section.label}
            >
              <AdminIcon name={section.icon} className="admin-sidebar__icon" />
              <span className="admin-sidebar__label">{section.label}</span>
              <AdminIcon name="arrow" className="admin-sidebar__chevron" />
            </NavLink>

            <div className="admin-sidebar__submenu">
              {section.items.map((item) => (
                <NavLink
                  className={({ isActive }) => `admin-sidebar__submenu-item ${isActive ? 'is-active' : ''}`}
                  key={item.key}
                  to={item.path}
                >
                  {item.label || item.title}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
