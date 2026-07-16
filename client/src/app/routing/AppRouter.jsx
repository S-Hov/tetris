import { useEffect } from 'react'
import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { routes } from './routes.js'
import NotFoundPage from '@/pages/NotFound/NotFoundPage.jsx'
import { trackPageView } from '@/shared/api/analytics'
import InnerPageLayout from '../layouts/InnerPageLayout.jsx'
import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedPath, stripLanguageFromPathname, SUPPORTED_LANGUAGES } from '@/i18n'

const APP_TITLE = 'PVP Blocks'

const AppRouter = () => {
    const location = useLocation()

    useEffect(() => {
        trackPageView({
            path: `${location.pathname}${location.search}`,
        })
    }, [location.pathname, location.search])

    const legacyRedirectRoutes = getLegacyRedirectRoutes(routes)

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/ru" replace />} />
            {legacyRedirectRoutes.map((path) => (
                <Route key={`legacy-${path}`} path={path} element={<LanguageRedirect />} />
            ))}
            {routes.map((route) => {
                const PageComponent = route.component
                const Layout = route.layout || DefaultLayout
                const Guard = route.guard || NoGuard

                return (
                    <Route
                        key={route.key}
                        path={getLocalizedRoutePath(route.path)}
                        element={
                            <LanguageRoute>
                                <Guard>
                                    {route.skipDocumentTitle ? null : <DocumentTitle title={route.title} />}
                                    <Layout hideFooter={route.hideFooter}>
                                        <PageComponent />
                                    </Layout>
                                </Guard>
                            </LanguageRoute>
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

const getLocalizedRoutePath = (path) => {
    if (path === '/:lang') {
        return path
    }

    const pathWithoutLanguage = stripLanguageFromRoutePath(path)

    return `/:lang${pathWithoutLanguage === '/' ? '' : pathWithoutLanguage}`
}

const getLegacyRedirectRoutes = (appRoutes) => {
    const paths = new Set()

    appRoutes.forEach(({ path }) => {
        const pathWithoutLanguage = stripLanguageFromRoutePath(path)

        if (pathWithoutLanguage !== '/') {
            paths.add(pathWithoutLanguage)
        }
    })

    return [...paths]
}

const stripLanguageFromRoutePath = (path = '') => {
    if (path === '/:lang') {
        return '/'
    }

    return path.replace(/^\/:lang(?=\/|$)/, '') || '/'
}

const LanguageRedirect = () => {
    const location = useLocation()
    const language = getLanguageFromPathname(location.pathname)

    return (
        <Navigate
            to={getLocalizedPath(`${location.pathname}${location.search}`, language)}
            replace
            state={location.state}
        />
    )
}

const LanguageRoute = ({ children }) => {
    const location = useLocation()
    const { lang } = useParams()
    const { i18n } = useTranslation()
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)

    useEffect(() => {
        if (isSupportedLanguage && i18n.language !== lang) {
            i18n.changeLanguage(lang)
        }
    }, [i18n, isSupportedLanguage, lang])

    if (!isSupportedLanguage) {
        return (
            <Navigate
                to={getLocalizedPath(stripLanguageFromPathname(location.pathname), DEFAULT_LANGUAGE)}
                replace
                state={location.state}
            />
        )
    }

    return children
}

const DocumentTitle = ({ title }) => {
    const params = useParams()

    useEffect(() => {
        const pageTitle = typeof title === 'function' ? title(params) : title

        document.title = pageTitle ? `${pageTitle} | ${APP_TITLE}` : APP_TITLE
    }, [params, title])

    return null
}

export default AppRouter
