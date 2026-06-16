import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth.js'
import { getLocalizedPath } from '@/i18n'

const ProtectedRoute = ({ children }) => {
    const location = useLocation()
    const { isAuth, isLoading } = useAuth()

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (!isAuth) {
        return <Navigate to={getLocalizedPath('/login')} replace state={{ from: location }} />
    }

    return children
}

export default ProtectedRoute
