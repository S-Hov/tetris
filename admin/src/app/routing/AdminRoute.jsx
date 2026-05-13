import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth.js'

export function AdminRoute({ children }) {
  const { isAuth, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="route-loader">Проверяем доступ...</div>
  }

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
