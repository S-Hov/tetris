export const navItems = [
    { key: 'home', labelKey: 'header.nav.home', icon: 'fas fa-home', to: '/' },
    { key: 'about', labelKey: 'header.nav.about', icon: 'fas fa-info-circle', to: '/about' },
    { key: 'profile', labelKey: 'header.nav.profile', icon: 'fas fa-user-astronaut', to: '/profile' },
    { key: 'leaderboard', labelKey: 'header.nav.leaderboard', icon: 'fas fa-trophy', to: '/rating' },
    { key: 'support', labelKey: 'header.nav.support', icon: 'fas fa-headset', to: '/support' }
]

export const modeItems = [
    { key: 'solo', label: 'SOLO', icon: 'fas fa-user', to: '/game/solo/casual' },
    { key: '1v1', label: '1v1', icon: 'fas fa-fist-raised', to: '/game/1v1/ranked' },
    { key: '2v2', label: '2v2', icon: 'fas fa-users', to: '/game/2v2/ranked' },
    { key: '5v5', label: '5v5', icon: 'fas fa-gamepad', to: '/game/5v5/ranked' },
    { key: 'battle', label: 'ROYALE', icon: 'fas fa-crown', to: '/game/royale/ranked' }
]

export const modeStats = {
    solo: { online: '892', rating: '8750', lobbies: '12' },
    '1v1': { online: '2.3k', rating: '9842', lobbies: '47' },
    '2v2': { online: '3.1k', rating: '10234', lobbies: '89' },
    '5v5': { online: '5.7k', rating: '15200', lobbies: '126' },
    battle: { online: '9.9k', rating: '21040', lobbies: '312' }
}
