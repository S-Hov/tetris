import { useEffect, useState } from 'react'
import AuthContext from './AuthContext.js'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const checkAuth = async () => {
        try {
            const response = await fetch('http://localhost:8880/auth/me', {
                credentials: 'include',
            })

            if (!response.ok) {
                setUser(null)
                return
            }

            const data = await response.json()
            setUser(data.data)
        } catch {
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuth()
    }, [])

    const logout = async () => {
        await fetch('http://localhost:8880/auth/logout', {
            method: 'POST',
            credentials: 'include',
        })

        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuth: !!user,
                isLoading,
                setUser,
                checkAuth,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}