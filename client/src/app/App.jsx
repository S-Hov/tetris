import AppRouter from './routing/AppRouter.jsx'
import { Toaster } from 'react-hot-toast'
import useAppSocketSession from '@/shared/hooks/useAppSocketSession.js'
import RoomInviteModal from '@/widgets/RoomInviteModal'
import CookieConsentBanner from '@/widgets/CookieConsentBanner'
import { UserActionsProvider } from '@/shared/context/UserActionsContext.jsx'

const App = () => {
  useAppSocketSession()

  return (
    <>
      <Toaster 
        position="bottom-right" 
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0
          }
        }}
      />
      <UserActionsProvider>
        <AppRouter />
        <RoomInviteModal />
        <CookieConsentBanner />
      </UserActionsProvider>
    </>
  )
}

export default App
