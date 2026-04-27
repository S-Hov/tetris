import HomePage from '@/pages/Home/HomePage.jsx'
import LoginPage from '@/pages/Login/LoginPage.jsx'
import RegisterPage from '@/pages/Register/RegisterPage.jsx'
import ProfilePage from '@/pages/Profile/ProfilePage.jsx'
import MatchesPage from '@/pages/Matches/MatchesPage.jsx'
import MatchDetailsPage from '@/pages/MatchDetails/MatchDetailsPage.jsx'
import ModeSelectPage from '@/pages/ModeSelect/ModeSelectPage.jsx'
import RatingPage from '@/pages/Rating/RatingPage.jsx'

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
        key: 'matches',
        path: '/matches',
        component: MatchesPage,
        layout: InnerPageLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'rating',
        path: '/rating',
        component: RatingPage,
        layout: MainLayout,
    },
    {
        key: 'match-details',
        path: '/matches/:matchId',
        component: MatchDetailsPage,
        layout: InnerPageLayout,
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
        key: 'solo-play',
        path: '/game/solo/play',
        component: GamePage,
        layout: MainLayout,
    },
    {
        key: 'mode-select',
        path: '/game/:mode',
        component: ModeSelectPage,
        layout: MainLayout,
    },
    {
        key: 'Lobby',
        path: '/game/:mode/lobby',
        component: LobbyPage,
        layout: InnerPageLayout,
    },
    {
        key: 'Match',
        path: '/match/:roomId',
        component: MatchPage,
        layout: MainLayout,
    },
]
