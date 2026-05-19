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
        secondaryTo: '/',
        secondaryLabel: 'На главную',
    },
    {
        match: (pathname) => /^\/game\/[^/]+$/.test(pathname) && pathname !== '/game/solo',
        backTo: '/',
        backLabel: 'На главную',
    },
    {
        match: (pathname) => /^\/game\/[^/]+\/(lobby|party)$/.test(pathname),
        backTo: (pathname) => pathname.replace(/\/(lobby|party)$/, ''),
        backLabel: 'К режиму',
        secondaryTo: '/',
        secondaryLabel: 'На главную',
    },
    {
        match: (pathname) => pathname === '/support/requests',
        backTo: '/profile',
        backLabel: 'К профилю',
        secondaryTo: '/',
        secondaryLabel: 'На главную',
    },
    {
        match: (pathname) => pathname.startsWith('/support/'),
        backTo: '/support/requests',
        backLabel: 'К Обращениям',
        secondaryTo: '/',
        secondaryLabel: 'На главную',
    },
]
