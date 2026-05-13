import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AuthContext from '@/shared/context/AuthContext.js'
import { authAPI } from '@/shared/api/auth'
import { adminAPI } from '@/shared/api/admin'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const requestIdRef = useRef(0)

  const checkAuth = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!silent) {
      setIsLoading(true)
    }

    try {
      const response = await adminAPI.me()
      const currentUser = response.user || null

      if (requestIdRef.current === requestId) {
        setUser(currentUser)
      }

      return currentUser
    } catch {
      if (requestIdRef.current === requestId) {
        setUser(null)
      }

      return null
    } finally {
      if (requestIdRef.current === requestId && !silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      checkAuth()
    })
  }, [checkAuth])

  const login = useCallback(async (credentials) => {
    await authAPI.login(credentials)
    let response

    try {
      response = await adminAPI.me()
    } catch (error) {
      await authAPI.logout().catch(() => {})
      throw error
    }

    const currentUser = response.user || null

    requestIdRef.current += 1
    setUser(currentUser)
    setIsLoading(false)

    return currentUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } finally {
      requestIdRef.current += 1
      setUser(null)
      setIsLoading(false)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    isAuth: Boolean(user),
    isAdmin: user?.role === 'admin',
    isLoading,
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
