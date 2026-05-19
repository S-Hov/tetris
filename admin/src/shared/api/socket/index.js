import { io } from 'socket.io-client'

const getSocketBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8880`
  }

  return 'http://127.0.0.1:8880'
}

export const adminSocket = io(getSocketBaseUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
})

export const ensureAdminSocket = () => {
  if (!adminSocket.connected) {
    adminSocket.connect()
  }

  return adminSocket
}
