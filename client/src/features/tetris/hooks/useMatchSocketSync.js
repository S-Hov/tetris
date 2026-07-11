import { useEffect, useState } from 'react'

import { createBoard } from '@/features/tetris/model/createBoard.js'
import { applyIncomingEffect } from '@/features/tetris/effects/runtime.js'
import { resolveAbilityChoice } from '@/features/tetris/model/tetrisEngine.js'
import { getEffectImplementation } from '@/features/tetris/effects/registry.js'
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

const getRoomPlayers = (room) => {
    if (!room) {
        return []
    }

    if (Array.isArray(room.players)) {
        return room.players
    }

    return (room.teams || []).flatMap((team) => team.players || [])
}

const mergePlayerGameState = (players, socketId, payload) => (
    players.map((player) => (
        player.socketId === socketId
            ? {
                ...player,
                gameState: {
                    ...(player.gameState || {}),
                    ...payload,
                    board: Array.isArray(payload?.board) ? payload.board : player.gameState?.board,
                },
            }
            : player
    ))
)

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
    const [roomSnapshot, setRoomSnapshot] = useState(null)

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

                if (response.room) {
                    setRoomSnapshot(response.room)
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

        const handleOpponentUpdate = ({ socketId, payload }) => {
            setOpponentState((prevState) => ({
                ...prevState,
                ...payload,
                board: Array.isArray(payload?.board) ? payload.board : prevState.board,
            }))
            setRoomSnapshot((currentRoom) => {
                if (!currentRoom || !socketId) {
                    return currentRoom
                }

                return {
                    ...currentRoom,
                    players: mergePlayerGameState(getRoomPlayers(currentRoom), socketId, payload),
                }
            })
        }

        const handleRoomState = (room) => {
            setRoomSnapshot(room || null)
        }

        const handlePersistenceError = ({ message } = {}) => {
            notify(message || 'Не удалось сохранить данные матча', 'error')
        }

        const handlePersistenceSuccess = ({ message } = {}) => {
            if (message) {
                notify(message, 'success')
            }
        }

        socket.on('opponent:update', handleOpponentUpdate)
        socket.on('room:state', handleRoomState)
        socket.on('persistence:error', handlePersistenceError)
        socket.on('persistence:success', handlePersistenceSuccess)

        return () => {
            socket.off('opponent:update', handleOpponentUpdate)
            socket.off('room:state', handleRoomState)
            socket.off('persistence:error', handlePersistenceError)
            socket.off('persistence:success', handlePersistenceSuccess)
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
            const effectKey = effect?.effectKey || effect?.type

            if (!effectKey) return
            if (!getEffectImplementation(effectKey)) {
                console.warn(`Effect implementation is unavailable: ${effectKey}`)
                return
            }

            setGameState((prevState) => applyIncomingEffect(prevState, {
                ...effect,
                effectKey,
            }))

            if (effectKey === 'speed_x2_for_4s') {
                notify('На вас применили ускорение x2 на 4 секунды', 'warning')
            }

            if (effectKey === 'darkness') {
                notify(`Поле затемнено на ${effect.durationMs / 1000} секунды`, 'warning')
            }

            if (!['speed_x2_for_4s', 'darkness'].includes(effectKey)) {
                notify(`На вас применили эффект: ${String(effectKey).replaceAll('_', ' ')}`, 'warning')
            }
        }

        socket.on('effect:apply', handleEffectApply)

        return () => {
            socket.off('effect:apply', handleEffectApply)
        }
    }, [enabled, setGameState])

    const handleAbilityChoose = (ability, targetSocketId = null) => {
        if (!enabled || !roomId) {
            setGameState((prevState) => resolveAbilityChoice(prevState, ability, { randomPiece }))
            return Promise.resolve(true)
        }

        return new Promise((resolve) => {
            socket.emit('ability:use', {
                roomId,
                abilityId: ability.id,
                targetSocketId,
            }, (response) => {
                if (!response?.success) {
                    notify(response?.message || 'Не удалось применить способность', 'error')
                    resolve(false)
                    return
                }

                notify(`${ability.title} activated`, 'success')
                setGameState((prevState) => resolveAbilityChoice(prevState, ability, { randomPiece }))
                resolve(true)
            })
        })
    }

    return {
        handleAbilityChoose,
        opponentState,
        roomPlayers: getRoomPlayers(roomSnapshot),
        roomSnapshot,
    }
}
