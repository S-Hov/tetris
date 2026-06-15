import { useEffect, useState } from 'react'

const getMatches = (query) => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return false
    }

    return window.matchMedia(query).matches
}

const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => getMatches(query))

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return undefined
        }

        const mediaQuery = window.matchMedia(query)
        const handleChange = () => setMatches(mediaQuery.matches)

        handleChange()
        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [query])

    return matches
}

export default useMediaQuery
