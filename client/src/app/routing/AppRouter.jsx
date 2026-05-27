import { useEffect } from 'react'
import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { routes } from './routes.js'
import NotFoundPage from '@/pages/NotFound/NotFoundPage.jsx'
import { trackPageView } from '@/shared/api/analytics'
import InnerPageLayout from '../layouts/InnerPageLayout.jsx'

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
            <Route path="/" element={<Navigate to="/ru" replace />} />
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
                                {route.skipDocumentTitle ? null : <DocumentTitle title={route.title} />}
                                <Layout hideFooter={route.hideFooter}>
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
                    <InnerPageLayout>
                        <DocumentTitle title="Страница не найдена" />
                        <NotFoundPage />
                    </InnerPageLayout>
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
