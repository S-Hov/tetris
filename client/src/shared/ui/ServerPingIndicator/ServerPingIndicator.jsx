import { useEffect, useState } from 'react'

import { socket } from '@/shared/api/socket'

import './ServerPingIndicator.css'

const PING_INTERVAL_MS = 4000
const PING_TIMEOUT_MS = 2500

const getLatencyTone = (latency, isConnected) => {
    if (!isConnected || !Number.isFinite(latency)) {
        return 'offline'
    }

    if (latency <= 80) {
        return 'good'
    }

    if (latency <= 180) {
        return 'medium'
    }

    return 'bad'
}

const emitPing = () => {
    return new Promise((resolve, reject) => {
        const startedAt = performance.now()

        socket.timeout(PING_TIMEOUT_MS).emit('ping:measure', {}, (error) => {
            if (error) {
                reject(error)
                return
            }

            resolve(Math.max(0, Math.round(performance.now() - startedAt)))
        })
    })
}

const ServerPingIndicator = ({ className = '' }) => {
    const [latency, setLatency] = useState(null)
    const [isConnected, setIsConnected] = useState(socket.connected)
    const [isChecking, setIsChecking] = useState(false)
    const tone = getLatencyTone(latency, isConnected)
    const label = isConnected && Number.isFinite(latency) ? `${latency} ms` : '-- ms'

    useEffect(() => {
        const handleConnect = () => setIsConnected(true)
        const handleDisconnect = () => {
            setIsConnected(false)
            setLatency(null)
        }

        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleDisconnect)

        return () => {
            socket.off('connect', handleConnect)
            socket.off('disconnect', handleDisconnect)
            socket.off('connect_error', handleDisconnect)
        }
    }, [])

    useEffect(() => {
        if (!isConnected) {
            return undefined
        }

        let isActive = true
        let intervalId = 0

        const measure = async () => {
            setIsChecking(true)

            try {
                const nextLatency = await emitPing()

                if (isActive) {
                    setLatency(nextLatency)
                }
            } catch {
                if (isActive) {
                    setLatency(null)
                }
            } finally {
                if (isActive) {
                    setIsChecking(false)
                }
            }
        }

        measure()
        intervalId = window.setInterval(measure, PING_INTERVAL_MS)

        return () => {
            isActive = false
            window.clearInterval(intervalId)
        }
    }, [isConnected])

    return (
        <div
            className={`server-ping server-ping--${tone} ${isChecking ? 'server-ping--checking' : ''} ${className}`.trim()}
            title="Ping игрового socket-соединения"
            aria-label={`Ping игрового socket-соединения: ${label}`}
        >
            <span className="server-ping__dot" aria-hidden="true"></span>
            <span className="server-ping__label">PING</span>
            <span className="server-ping__value">{label}</span>
        </div>
    )
}

export default ServerPingIndicator
