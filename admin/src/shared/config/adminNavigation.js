import { adminResourceConfigs } from './adminResources.js'

const resource = (key) => adminResourceConfigs[key]

export const adminNavigation = [
  {
    key: 'overview',
    label: 'Обзор',
    icon: 'dashboard',
    items: [
      { key: 'dashboard', label: 'Главная', path: '/dashboard' },
      resource('visits'),
      resource('gameActivity'),
      resource('sessions'),
    ],
  },
  {
    key: 'users',
    label: 'Пользователи',
    icon: 'users',
    items: [
      resource('users'),
      resource('roles'),
      resource('authLogs'),
      resource('emailVerifications'),
    ],
  },
  {
    key: 'games',
    label: 'Игры',
    icon: 'gamepad',
    items: [
      resource('matches'),
      resource('matchTeams'),
      resource('matchPlayers'),
      resource('matchEvents'),
      resource('rooms'),
      resource('roomPlayers'),
    ],
  },
  {
    key: 'rating',
    label: 'Рейтинг',
    icon: 'ranking',
    items: [
      resource('rankStats'),
      resource('ratingHistory'),
    ],
  },
  {
    key: 'support',
    label: 'Поддержка',
    icon: 'support',
    items: [
      resource('supportRequests'),
    ],
  },
  {
    key: 'donations',
    label: 'Донаты',
    icon: 'wallet',
    items: [
      resource('donations'),
      resource('donationCurrencies'),
      resource('donationNetworks'),
      resource('donationCurrencyNetworks'),
      resource('donationWallets'),
      resource('donationVerificationEvents'),
    ],
  },
  {
    key: 'system',
    label: 'Система',
    icon: 'settings',
    items: [
      resource('adminAudit'),
      resource('migrations'),
    ],
  },
]
