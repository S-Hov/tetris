import { useEffect, useState } from 'react'

import { createBoard } from '@/features/tetris/model/createBoard.js'
import { resolveAbilityChoice } from '@/features/tetris/model/tetrisEngine.js'
import { ensureSocketSession, socket } from '@/shared/api/socket/index.js'
import notify from '@/utils/Notifications'

const createOpponentState = () => ({
    score: 0,
    linesCleared: 0,
    level: 1,
    isGameOver: false,
    isPaused: false,
    energy: 0,
    board: createBoard(),
    isChoosingAbility: false,
    abilityOptions: [],
    abilityChoiceEndsAt: null,
})

const emitWithAck = (eventName, payload) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: 'Нет ответа от сервера' })
        })
    })
}

export const useMatchSocketSync = ({
    boardWithPiece,
    derivedState,
    enabled,
    isMatchFinished,
    randomPiece,
    roomId,
    setGameState,
    setRoomSettings,
    user,
} = {}) => {
    const [opponentState, setOpponentState] = useState(() => createOpponentState())

    useEffect(() => {
        if (!enabled) {
            return undefined
        }

        const restoreMatchSocketSession = async () => {
            try {
                await ensureSocketSession({ user })

                if (!roomId) {
                    return
                }

                const response = await emitWithAck('room:join', { roomId })

                if (!response.success) {
                    notify(response.message || 'Не удалось восстановить участие в матче', 'warning')
                    return
                }

                if (response.room?.settings) {
                    setRoomSettings(response.room.settings)
                }
            } catch (error) {
                notify(error.message || 'Не удалось восстановить подключение к матчу', 'error')
            }
        }

        restoreMatchSocketSession()

        return undefined
    }, [enabled, roomId, setRoomSettings, user])

    useEffect(() => {
        if (!enabled) {
            return undefined
        }

        const handleOpponentUpdate = ({ payload }) => {
            setOpponentState((prevState) => ({
                ...prevState,
                ...payload,
                board: Array.isArray(payload?.board) ? payload.board : prevState.board,
            }))
        }

        socket.on('opponent:update', handleOpponentUpdate)

        return () => {
            socket.off('opponent:update', handleOpponentUpdate)
        }
    }, [enabled])

    useEffect(() => {
        if (!enabled || !roomId || isMatchFinished) {
            return
        }

        socket.emit('game:update', {
            roomId,
            payload: {
                score: derivedState.score,
                linesCleared: derivedState.linesCleared,
                level: derivedState.level,
                isGameOver: derivedState.isGameOver,
                isPaused: derivedState.isPaused,
                board: boardWithPiece,
                energy: derivedState.energy,
            },
        })
    }, [
        boardWithPiece,
        derivedState.energy,
        derivedState.isGameOver,
        derivedState.isPaused,
        derivedState.level,
        derivedState.linesCleared,
        derivedState.score,
        enabled,
        isMatchFinished,
        roomId,
    ])

    useEffect(() => {
        if (!enabled || !derivedState.isGameOver || !roomId || isMatchFinished) {
            return
        }

        socket.emit('game:over', {
            roomId,
            payload: {
                score: derivedState.score,
                linesCleared: derivedState.linesCleared,
                level: derivedState.level,
            },
        })
    }, [
        derivedState.isGameOver,
        derivedState.level,
        derivedState.linesCleared,
        derivedState.score,
        enabled,
        isMatchFinished,
        roomId,
    ])

    useEffect(() => {
        if (!enabled) {
            return undefined
        }

        const handleEffectApply = ({ effect }) => {
            if (!effect?.type) return

            const expiresAt = Date.now() + (effect.durationMs || 4000)

            setGameState((prevState) => ({
                ...prevState,
                activeEffects: [
                    ...prevState.activeEffects.filter((item) => item.type !== effect.type),
                    {
                        type: effect.type,
                        expiresAt,
                    },
                ],
            }))

            if (effect.type === 'speed_x2_for_4s') {
                notify('На вас применили ускорение x2 на 4 секунды', 'warning')
            }

            if (effect.type === 'darkness') {
                notify(`Поле затемнено на ${(effect.durationMs || 4000) / 1000} секунды`, 'warning')
            }
        }

        socket.on('effect:apply', handleEffectApply)

        return () => {
            socket.off('effect:apply', handleEffectApply)
        }
    }, [enabled, setGameState])

    const handleAbilityChoose = (ability) => {
        if (!enabled || !roomId) {
            setGameState((prevState) => resolveAbilityChoice(prevState, ability, { randomPiece }))
            return
        }

        socket.emit('ability:use', {
            roomId,
            abilityId: ability.id,
        }, (response) => {
            if (!response?.success) {
                notify(response?.message || 'Не удалось применить способность', 'error')
                return
            }

            notify(`${ability.title} activated`, 'success')
            setGameState((prevState) => resolveAbilityChoice(prevState, ability, { randomPiece }))
        })
    }

    return {
        handleAbilityChoose,
        opponentState,
    }
}
