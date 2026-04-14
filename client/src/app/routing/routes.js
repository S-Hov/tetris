import HomePage from '../../pages/Home/HomePage.jsx'
import LoginPage from '../../pages/Login/LoginPage.jsx'
import RegisterPage from '../../pages/Register/RegisterPage.jsx'
import ProfilePage from '../../pages/Profile/ProfilePage.jsx'

import MainLayout from '../layouts/MainLayout.jsx'
import InnerPageLayout from '../layouts/InnerPageLayout.jsx'

import ProtectedRoute from './ProtectedRoute.jsx'
import GuestRoute from './GuestRoute.jsx'

export const routes = [
    {
        key: 'home',
        path: '/',
        component: HomePage,
        layout: MainLayout,
    },
    {
        key: 'login',
        path: '/login',
        component: LoginPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
    },
    {
        key: 'register',
        path: '/register',
        component: RegisterPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
    },
    {
        key: 'profile',
        path: '/profile',
        component: ProfilePage,
        layout: InnerPageLayout,
        guard: ProtectedRoute,
    },
]