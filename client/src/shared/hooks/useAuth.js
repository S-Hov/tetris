import { useCallback, useContext, useState } from 'react'
import AuthContext from '../context/AuthContext.js'
import { authenticationAPI } from '../api/auth'

export const useAuth = () => {
    const authContext = useContext(AuthContext)

    if (!authContext) {
        throw new Error('useAuth must be used within AuthProvider')
    }

    return authContext
}

export const useRegister = () => {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState(null)

    const mutate = useCallback(async (data) => {
        setIsPending(true)
        setError(null)

        try {
            return await authenticationAPI.register(data)
        } catch (err) {
            setError(err)
            throw err
        } finally {
            setIsPending(false)
        }
    }, [])

    return { mutate, isPending, error }
}
