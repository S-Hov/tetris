import HomePage from '@/pages/Home/HomePage.jsx'
import LoginPage from '@/pages/Login/LoginPage.jsx'
import RegisterPage from '@/pages/Register/RegisterPage.jsx'
import ProfilePage from '@/pages/Profile/ProfilePage.jsx'
import AccountSettingsPage from '@/pages/AccountSettings/AccountSettingsPage.jsx'
import FriendsPage from '@/pages/Friends/FriendsPage.jsx'
import MatchesPage from '@/pages/Matches/MatchesPage.jsx'
import MatchDetailsPage from '@/pages/MatchDetails/MatchDetailsPage.jsx'
import ModeSelectPage from '@/pages/ModeSelect/ModeSelectPage.jsx'
import RatingPage from '@/pages/Rating/RatingPage.jsx'
import AboutPage from '@/pages/About/AboutPage.jsx'
import SupportPage from '@/pages/Support/SupportPage.jsx'
import SupportRequestsPage from '@/pages/SupportRequests/SupportRequestsPage.jsx'
import SupportRequestDetailsPage from '@/pages/SupportRequestDetails/SupportRequestDetailsPage.jsx'
import EffectsPage from '@/pages/Effects/EffectsPage.jsx'

import MainLayout from '../layouts/MainLayout.jsx'
import InnerPageLayout from '../layouts/InnerPageLayout.jsx'

import ProtectedRoute from './ProtectedRoute.jsx'
import GuestRoute from './GuestRoute.jsx'
import VerifyEmailPage from '@/pages/VerifyEmail/VerifyEmailPage.jsx'
import GamePage from '@/pages/GamePage/GamePage.jsx'
import GameSettingsPage from '@/pages/GameSettings/GameSettingsPage.jsx'
import LobbyPage from '@/pages/Lobby/LobbyPage.jsx'
import MatchPage from '@/pages/Match/MatchPage.jsx'
import MobileControlsPage from '@/pages/MobileControls/MobileControlsPage.jsx'
import PcControlsPage from '@/pages/PcControls/PcControlsPage.jsx'
import TeamQueuePage from '@/pages/TeamQueue/TeamQueuePage.jsx'
import { getModeSelectionConfig } from '@/shared/config/gameModes.js'

const getModeTitle = (modeKey) => getModeSelectionConfig(modeKey).title

export const routes = [
    {
        key: 'home',
        path: '/:lang',
        title: 'Главная',
        component: HomePage,
        layout: MainLayout,
        skipDocumentTitle: true,
    },
    {
        key: 'login',
        path: '/login',
        title: 'Вход',
        component: LoginPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
        skipDocumentTitle: true,
    },
    {
        key: 'register',
        path: '/register',
        title: 'Регистрация',
        component: RegisterPage,
        layout: InnerPageLayout,
        guard: GuestRoute,
        skipDocumentTitle: true,
    },
    {
        key: 'profile',
        path: '/:lang/profile',
        title: 'Профиль',
        component: ProfilePage,
        layout: MainLayout,
        guard: ProtectedRoute,
        skipDocumentTitle: true,
    },
    {
        key: 'account-settings',
        path: '/account-settings',
        title: 'Настройки аккаунта',
        component: AccountSettingsPage,
        layout: MainLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'account-settings-section',
        path: '/account-settings/:section',
        title: 'Настройки аккаунта',
        component: AccountSettingsPage,
        layout: MainLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'friends',
        path: '/friends',
        title: 'Друзья',
        component: FriendsPage,
        layout: MainLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'friends-section',
        path: '/friends/:section',
        title: 'Друзья',
        component: FriendsPage,
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
        path: '/:lang/rating',
        title: 'Рейтинг',
        component: RatingPage,
        layout: MainLayout,
        skipDocumentTitle: true,
    },
    {
        key: 'about',
        path: '/:lang/about',
        title: 'О нас',
        component: AboutPage,
        layout: MainLayout,
    },
    {
        key: 'effects',
        path: '/effects',
        title: 'Игровые эффекты',
        component: EffectsPage,
        layout: MainLayout,
    },
    {
        key: 'support',
        path: '/:lang/support',
        title: 'Поддержка',
        component: SupportPage,
        layout: MainLayout,
    },
    {
        key: 'support-requests',
        path: '/support/requests',
        title: 'Мои обращения',
        component: SupportRequestsPage,
        layout: InnerPageLayout,
        guard: ProtectedRoute,
    },
    {
        key: 'support-request-details',
        path: '/support/requests/:ticketId',
        title: ({ ticketId }) => `Обращение #${ticketId}`,
        component: SupportRequestDetailsPage,
        layout: InnerPageLayout,
        guard: ProtectedRoute,
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
        skipDocumentTitle: true,
    },
    {
        key: 'solo-play',
        path: '/:lang/game/solo/play',
        title: 'Одиночная игра',
        component: GamePage,
        layout: MainLayout,
        hideFooter: true,
    },
    {
        key: 'game-settings',
        path: '/:lang/game/controls',
        title: 'Настройки игры',
        component: GameSettingsPage,
        layout: MainLayout,
    },
    {
        key: 'pc-controls',
        path: '/:lang/game/controls/pc',
        title: 'Управление для ПК',
        component: PcControlsPage,
        layout: MainLayout,
    },
    {
        key: 'mobile-controls',
        path: '/:lang/game/controls/mobile',
        title: 'Мобильное управление',
        component: MobileControlsPage,
        layout: MainLayout,
    },
    {
        key: 'mode-select',
        path: '/:lang/game/:mode',
        title: ({ mode }) => getModeTitle(mode),
        component: ModeSelectPage,
        layout: MainLayout,
    },
    {
        key: 'Lobby',
        path: '/:lang/game/:mode/lobby',
        title: ({ mode }) => `Лобби: ${getModeTitle(mode)}`,
        component: LobbyPage,
        layout: InnerPageLayout,
    },
    {
        key: 'TeamQueue',
        path: '/:lang/game/:mode/party',
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
        hideFooter: true,
    },
]
