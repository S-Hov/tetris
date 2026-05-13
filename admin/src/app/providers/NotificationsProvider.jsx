import { Toaster } from 'react-hot-toast'

export function NotificationsProvider() {
  return (
    <Toaster
      position="bottom-right"
      reverseOrder={false}
      toastOptions={{
        duration: 3200,
        style: {
          borderRadius: '8px',
          border: '1px solid #d7dee8',
          background: '#ffffff',
          color: '#172033',
          boxShadow: '0 18px 42px rgba(15, 23, 42, 0.14)',
        },
        success: {
          iconTheme: {
            primary: '#0f766e',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#dc2626',
            secondary: '#ffffff',
          },
        },
      }}
    />
  )
}
