import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth.js'

const GuestRoute = ({ children }) => {
    const { isAuth, isLoading } = useAuth()

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (isAuth) {
        return <Navigate to="/profile" replace />
    }

    return children
}

export default GuestRoute