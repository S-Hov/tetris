import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth.js'

export function GuestRoute({ children }) {
  const { isAuth, isLoading } = useAuth()

  if (isLoading) {
    return <div className="route-loader">Проверяем сессию...</div>
  }

  if (isAuth) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
