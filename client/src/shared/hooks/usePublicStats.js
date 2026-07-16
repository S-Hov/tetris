import { useEffect, useState } from 'react'

import { publicStatsAPI } from '@/shared/api/analytics'

const initialState = {
    data: null,
    error: '',
    isLoading: true,
}

const REFRESH_INTERVAL_MS = 30_000

const usePublicStats = () => {
    const [state, setState] = useState(initialState)

    useEffect(() => {
        let ignore = false

        const loadStats = () => {
            publicStatsAPI.get()
                .then((data) => {
                    if (!ignore) {
                        setState({ data, error: '', isLoading: false })
                    }
                })
                .catch((error) => {
                    if (!ignore) {
                        setState((currentState) => ({
                            data: currentState.data,
                            error: error?.message || 'Could not load arena statistics',
                            isLoading: false,
                        }))
                    }
                })
        }

        loadStats()
        const intervalId = window.setInterval(loadStats, REFRESH_INTERVAL_MS)

        return () => {
            ignore = true
            window.clearInterval(intervalId)
        }
    }, [])

    return state
}

export default usePublicStats
