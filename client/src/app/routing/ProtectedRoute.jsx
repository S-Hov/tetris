import { Navigate } from 'react-router-dom'
import { useAuth } from '../../shared/hooks/useAuth.js'

const ProtectedRoute = ({ children }) => {
    const { isAuth, isLoading } = useAuth()

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (!isAuth) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute