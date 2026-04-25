export const simpleHeaderConfig = [
    {
        match: (pathname) => pathname === '/register',
        backTo: '/login',
        backLabel: 'Ко входу',
    },
    {
        match: (pathname) => pathname === '/profile',
        backTo: '/',
        backLabel: 'На главную',
    },
    {
        match: (pathname) => pathname === '/matches',
        backTo: '/profile',
        backLabel: 'К профилю',
    },
    {
        match: (pathname) => pathname.startsWith('/matches/'),
        backTo: '/matches',
        backLabel: 'К матчам',
    },
]
