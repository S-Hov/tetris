import { useEffect } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminLayout } from '@/widgets/AdminLayout/AdminLayout.jsx'
import { AdminRoute } from './AdminRoute.jsx'
import { GuestRoute } from './GuestRoute.jsx'
import { routes } from './routes.js'
import { LoginPage } from '@/pages/Login/LoginPage.jsx'
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage.jsx'

const APP_TITLE = 'PVP Blocks Admin'

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <DocumentTitle title="Вход" />
            <LoginPage />
          </GuestRoute>
        }
      />

      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        {routes.map((route) => {
          const Page = route.component

          return (
            <Route
              key={route.key}
              path={route.path}
              element={
                <>
                  <DocumentTitle title={route.title} />
                  <Page route={route} />
                </>
              }
            />
          )
        })}
      </Route>

      <Route
        path="*"
        element={
          <>
            <DocumentTitle title="Страница не найдена" />
            <NotFoundPage />
          </>
        }
      />
    </Routes>
  )
}

function DocumentTitle({ title }) {
  const params = useParams()

  useEffect(() => {
    const pageTitle = typeof title === 'function' ? title(params) : title
    document.title = pageTitle ? `${pageTitle} | ${APP_TITLE}` : APP_TITLE
  }, [params, title])

  return null
}
