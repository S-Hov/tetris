import { Routes, Route } from 'react-router-dom'
import { routes } from './routes.js'
import NotFoundPage from '../../pages/NotFound/NotFoundPage.jsx'

const AppRouter = () => {
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
                                <Layout>
                                    <PageComponent />
                                </Layout>
                            </Guard>
                        }
                    />
                )
            })}

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    )
}

const DefaultLayout = ({ children }) => children
const NoGuard = ({ children }) => children

export default AppRouter