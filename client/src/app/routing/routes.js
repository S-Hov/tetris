import HomePage from '@/pages/Home/HomePage.jsx'
import LoginPage from '@/pages/Login/LoginPage.jsx'
import RegisterPage from '@/pages/Register/RegisterPage.jsx'
import ProfilePage from '@/pages/Profile/ProfilePage.jsx'
import MatchesPage from '@/pages/Matches/MatchesPage.jsx'
import MatchDetailsPage from '@/pages/MatchDetails/MatchDetailsPage.jsx'
import ModeSelectPage from '@/pages/ModeSelect/ModeSelectPage.jsx'
import RatingPage from '@/pages/Rating/RatingPage.jsx'
import AboutPage from '@/pages/About/AboutPage.jsx'
import SupportPage from '@/pages/Support/SupportPage.jsx'

import MainLayout from '../layouts/MainLayout.jsx'
import InnerPageLayout from '../layouts/InnerPageLayout.jsx'

import ProtectedRoute from './ProtectedRoute.jsx'
import GuestRoute from './GuestRoute.jsx'
import VerifyEmailPage from '@/pages/VerifyEmail/VerifyEmailPage.jsx'
import GamePage from '@/pages/GamePage/GamePage.jsx'
import LobbyPage from '@/pages/Lobby/LobbyPage.jsx'
import MatchPage from '@/pages/Match/MatchPage.jsx'
import TeamQueuePage from '@/pages/TeamQueue/TeamQueuePage.jsx'
import { getModeSelectionConfig } from '@/shared/config/gameModes.js'

const getModeTitle = (modeKey) => getModeSelectionConfig(modeKey).title

export const routes = [
    {
        key: 'home',
        path: '/',
        title: 'Главная',
        component: HomePage,
        layout: MainLayout,
    },
    {
        key: 'login',
        path: '/login',
        title: 'Вход',
        component: LoginPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
    },
    {
        key: 'register',
        path: '/register',
        title: 'Регистрация',
        component: RegisterPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
    },
    {
        key: 'profile',
        path: '/profile',
        title: 'Профиль',
        component: ProfilePage,
        layout: MainLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'matches',
        path: '/matches',
        title: 'История матчей',
        component: MatchesPage,
        layout: InnerPageLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'rating',
        path: '/rating',
        title: 'Рейтинг',
        component: RatingPage,
        layout: MainLayout,
    },
    {
        key: 'about',
        path: '/about',
        title: 'О нас',
        component: AboutPage,
        layout: MainLayout,
    },
    {
        key: 'support',
        path: '/support',
        title: 'Поддержка',
        component: SupportPage,
        layout: MainLayout,
    },
    {
        key: 'match-details',
        path: '/matches/:matchId',
        title: ({ matchId }) => `Матч #${matchId}`,
        component: MatchDetailsPage,
        layout: InnerPageLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'Email Verification',
        path: '/verify-email/:email',
        title: 'Подтверждение почты',
        component: VerifyEmailPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
    },
    {
        key: 'solo-play',
        path: '/game/solo/play',
        title: 'Одиночная игра',
        component: GamePage,
        layout: MainLayout,
    },
    {
        key: 'mode-select',
        path: '/game/:mode',
        title: ({ mode }) => getModeTitle(mode),
        component: ModeSelectPage,
        layout: MainLayout,
    },
    {
        key: 'Lobby',
        path: '/game/:mode/lobby',
        title: ({ mode }) => `Лобби: ${getModeTitle(mode)}`,
        component: LobbyPage,
        layout: InnerPageLayout,
    },
    {
        key: 'TeamQueue',
        path: '/game/:mode/party',
        title: ({ mode }) => `Команда: ${getModeTitle(mode)}`,
        component: TeamQueuePage,
        layout: InnerPageLayout,
    },
    {
        key: 'Match',
        path: '/match/:roomId',
        title: ({ roomId }) => `Игра #${roomId}`,
        component: MatchPage,
        layout: MainLayout,
    },
]
