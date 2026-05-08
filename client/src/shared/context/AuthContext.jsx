import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthContext from './AuthContext.js'
import { authenticationAPI } from '../api/auth'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const authRequestIdRef = useRef(0)

    const checkAuth = useCallback(async ({ silent = false } = {}) => {
        const requestId = authRequestIdRef.current + 1
        authRequestIdRef.current = requestId

        if (!silent) {
            setIsLoading(true)
        }

        try {
            const currentUser = await authenticationAPI.me()

            if (authRequestIdRef.current === requestId) {
                setUser(currentUser)
            }

            return currentUser
        } catch {
            if (authRequestIdRef.current === requestId) {
                setUser(null)
            }

            return null
        } finally {
            if (authRequestIdRef.current === requestId && !silent) {
                setIsLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    const login = useCallback(async (credentials) => {
        const response = await authenticationAPI.login(credentials)
        const currentUser = response.user

        authRequestIdRef.current += 1
        setUser(currentUser)
        setIsLoading(false)

        return response
    }, [])

    const logout = useCallback(async () => {
        try {
            await authenticationAPI.logout()
        } finally {
            authRequestIdRef.current += 1
            setUser(null)
            setIsLoading(false)
        }
    }, [])

    const value = useMemo(() => ({
        user,
        isAuth: !!user,
        isLoading,
        setUser,
        checkAuth,
        login,
        logout,
    }), [checkAuth, isLoading, login, logout, user])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
