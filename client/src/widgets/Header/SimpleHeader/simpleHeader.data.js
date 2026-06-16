export const simpleHeaderConfig = [
    {
        match: (pathname) => pathname === '/register',
        backTo: '/login',
        backLabelKey: 'simpleHeader.back.login',
    },
    {
        match: (pathname) => pathname === '/profile',
        backTo: '/',
        backLabelKey: 'simpleHeader.back.home',
    },
    {
        match: (pathname) => pathname === '/matches',
        backTo: '/profile',
        backLabelKey: 'simpleHeader.back.profile',
    },
    {
        match: (pathname) => pathname.startsWith('/matches/'),
        backTo: '/matches',
        backLabelKey: 'simpleHeader.back.matches',
        secondaryTo: '/',
        secondaryLabelKey: 'simpleHeader.back.home',
    },
    {
        match: (pathname) => /^\/game\/[^/]+$/.test(pathname) && !/^\/game\/solo\/?$/.test(pathname),
        backTo: '/',
        backLabelKey: 'simpleHeader.back.home',
    },
    {
        match: (pathname) => /^\/game\/[^/]+\/(lobby|party)$/.test(pathname),
        backTo: (pathname) => pathname.replace(/\/(lobby|party)$/, ''),
        backLabelKey: 'simpleHeader.back.mode',
        secondaryTo: '/',
        secondaryLabelKey: 'simpleHeader.back.home',
    },
    {
        match: (pathname) => pathname === '/support/requests',
        backTo: '/profile',
        backLabelKey: 'simpleHeader.back.profile',
        secondaryTo: '/',
        secondaryLabelKey: 'simpleHeader.back.home',
    },
    {
        match: (pathname) => pathname.startsWith('/support/'),
        backTo: '/support/requests',
        backLabelKey: 'simpleHeader.back.requests',
        secondaryTo: '/',
        secondaryLabelKey: 'simpleHeader.back.home',
    },
]
