import { useEffect, useRef, useState } from 'react'

import { socket } from '@/shared/api/socket/index.js'
import notify from '@/utils/Notifications'

const MATCH_END_REDIRECT_DELAY_MS = 5200

export const useMatchResult = ({
    enabled,
    modeKey,
    navigate,
    roomId,
    roomSettings,
} = {}) => {
    const [matchResult, setMatchResult] = useState(null)
    const redirectTimeoutRef = useRef(null)

    useEffect(() => {
        if (!enabled) {
            return undefined
        }

        const handleMatchEnd = ({ loserSocketId, winnerSocketId, matchType }) => {
            const nextMatchResult = loserSocketId === socket.id ? 'lose' : 'win'
            const shouldReturnToLobby = (matchType || roomSettings?.matchType) === 'private'

            setMatchResult((currentValue) => currentValue || nextMatchResult)

            notify(
                nextMatchResult === 'lose'
                    ? 'Раунд завершён. Вы проиграли'
                    : 'Раунд завершён. Вы победили',
                nextMatchResult === 'lose' ? 'warning' : 'success'
            )

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current)
            }

            redirectTimeoutRef.current = setTimeout(() => {
                navigate(shouldReturnToLobby ? `/game/${modeKey}/lobby` : `/game/${modeKey}`, {
                    replace: true,
                    state: shouldReturnToLobby
                        ? {
                            roomId,
                            matchResult: nextMatchResult,
                            winnerSocketId,
                            roomSettings,
                            modeKey,
                        }
                        : {
                            matchResult: nextMatchResult,
                            winnerSocketId,
                            roomSettings,
                            modeKey,
                        },
                })
            }, MATCH_END_REDIRECT_DELAY_MS)
        }

        socket.on('match:end', handleMatchEnd)

        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current)
            }

            socket.off('match:end', handleMatchEnd)
        }
    }, [enabled, modeKey, navigate, roomId, roomSettings])

    return {
        isMatchFinished: Boolean(matchResult),
        matchResult,
        setMatchResult,
    }
}
