import { Outlet, useNavigate } from 'react-router-dom'
import { AdminSidebar } from '@/widgets/AdminSidebar/AdminSidebar.jsx'
import { useAuth } from '@/shared/hooks/useAuth.js'
import { notify } from '@/shared/lib/notify.js'
import './AdminLayout.css'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    notify.success('Сессия завершена')
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-layout__body">
        <header className="admin-layout__topbar">
          <div className="admin-layout__user">
            <strong>{user?.username || 'Администратор'}</strong>
            <span>{user?.email || 'admin session'}</span>
          </div>
          <button type="button" onClick={handleLogout}>Выйти</button>
        </header>
        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
