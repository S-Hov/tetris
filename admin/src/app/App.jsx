import { AppRouter } from './routing/AppRouter.jsx'
import { NotificationsProvider } from './providers/NotificationsProvider.jsx'
import './App.css'

function App() {
  return (
    <>
      <NotificationsProvider />
      <AppRouter />
    </>
  )
}

export default App
