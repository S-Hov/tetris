import AppRouter from './routing/AppRouter.jsx'
import { Toaster } from 'react-hot-toast'

const App = () => {
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
      <AppRouter />
    </>
  )
}

export default App
