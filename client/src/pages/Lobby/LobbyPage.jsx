import { useEffect, useState } from 'react'
import { socket } from '../../shared/api/socket'
import { useNavigate } from 'react-router-dom'

const LobbyPage = () => {
    const [username, setUsername] = useState('')
    const [roomId, setRoomId] = useState('')
    const [currentRoom, setCurrentRoom] = useState(null)
    const [joinRoomId, setJoinRoomId] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const handleRoomState = (room) => {
            setCurrentRoom(room)
        }

        socket.on('room:state', handleRoomState)

        return () => {
            socket.off('room:state', handleRoomState)
        }
    }, [])

    useEffect(() => {
        const handleMatchStart = ({ roomId }) => {
            console.log('MATCH STARTED', roomId)

            navigate(`/match/${roomId}`)
        }

        socket.on('match:start', handleMatchStart)

        return () => {
            socket.off('match:start', handleMatchStart)
        }
    }, [navigate])

    const handleCreateRoom = () => {
        socket.emit('room:create', { username }, (response) => {
            if (!response.success) return
            setCurrentRoom(response.room)
            setRoomId(response.room.id)
        })
    }

    const handleJoinRoom = () => {
        socket.emit('room:join', { roomId: joinRoomId, username }, (response) => {
            if (!response.success) {
                alert(response.message)
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
        })
    }

    return (
        <section>
            <h2>Lobby</h2>

            <div>
                <input
                    type="text"
                    placeholder="Your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            <div>
                <button onClick={handleCreateRoom} disabled={!username}>
                    Create room
                </button>
            </div>

            <div>
                <input
                    type="text"
                    placeholder="Room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                />
                <button onClick={handleJoinRoom} disabled={!username || !joinRoomId}>
                    Join room
                </button>
            </div>

            {roomId && <p>Current room: {roomId}</p>}

            {currentRoom && (
                <div>
                    <h3>Players</h3>
                    <ul>
                        {currentRoom.players.map((player) => (
                            <li key={player.socketId}>
                                {player.username} — {player.isReady ? 'Ready' : 'Not ready'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <button
                onClick={() => {
                    socket.emit('player:ready', { roomId })
                }}
                disabled={!currentRoom}
            >
                Ready
            </button>
        </section>
    )
}

export default LobbyPage