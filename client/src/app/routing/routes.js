import HomePage from '@/pages/Home/HomePage.jsx'
import LoginPage from '@/pages/Login/LoginPage.jsx'
import RegisterPage from '@/pages/Register/RegisterPage.jsx'
import ProfilePage from '@/pages/Profile/ProfilePage.jsx'

import MainLayout from '../layouts/MainLayout.jsx'
import InnerPageLayout from '../layouts/InnerPageLayout.jsx'

import ProtectedRoute from './ProtectedRoute.jsx'
import GuestRoute from './GuestRoute.jsx'
import VerifyEmailPage from '@/pages/VerifyEmail/VerifyEmailPage.jsx'
import GamePage from '@/pages/GamePage/GamePage.jsx'
import LobbyPage from '@/pages/Lobby/LobbyPage.jsx'
import MatchPage from '@/pages/Match/MatchPage.jsx'

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
        layout: MainLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'Email Verification',
        path: '/verify-email/:email',
        component: VerifyEmailPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
    },
    {
        key: 'Solo',
        path: '/game/solo',
        component: GamePage,
        layout: MainLayout,
    },
    {
        key: 'Lobby',
        path: '/lobby',
        component: LobbyPage,
        layout: MainLayout,
    },
    {
        key: 'Match',
        path: '/match/:roomId',
        component: MatchPage,
        layout: MainLayout,
    },
]