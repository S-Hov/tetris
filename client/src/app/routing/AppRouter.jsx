import { useEffect } from 'react'
import { Routes, Route, useLocation, useParams } from 'react-router-dom'
import { routes } from './routes.js'
import NotFoundPage from '@/pages/NotFound/NotFoundPage.jsx'
import { trackPageView } from '@/shared/api/analytics'

const APP_TITLE = 'PVP Tetris'

const AppRouter = () => {
    const location = useLocation()

    useEffect(() => {
        trackPageView({
            path: `${location.pathname}${location.search}`,
        })
    }, [location.pathname, location.search])

    return (
        <Routes>
            {routes.map((route) => {
                const PageComponent = route.component
                const Layout = route.layout || DefaultLayout
                const Guard = route.guard || NoGuard

                return (
                    <Route
                        key={route.key}
                        path={route.path}
                        element={
                            <Guard>
                                <DocumentTitle title={route.title} />
                                <Layout>
                                    <PageComponent />
                                </Layout>
                            </Guard>
                        }
                    />
                )
            })}

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

const DefaultLayout = ({ children }) => children
const NoGuard = ({ children }) => children

const DocumentTitle = ({ title }) => {
    const params = useParams()

    useEffect(() => {
        const pageTitle = typeof title === 'function' ? title(params) : title

        document.title = pageTitle ? `${pageTitle} | ${APP_TITLE}` : APP_TITLE
    }, [params, title])

    return null
}

export default AppRouter
