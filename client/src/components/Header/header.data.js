export const navItems = [
    { key: 'home', label: 'ГЛАВНАЯ', icon: 'fas fa-home' },
    { key: 'about', label: 'О НАС', icon: 'fas fa-info-circle' },
    { key: 'profile', label: 'ЛИЧНЫЙ КАБИНЕТ', icon: 'fas fa-user-astronaut' },
    { key: 'leaderboard', label: 'РЕЙТИНГ', icon: 'fas fa-trophy' },
    { key: 'support', label: 'ПОДДЕРЖКА', icon: 'fas fa-headset' }
]

export const modeItems = [
    { key: 'solo', label: 'SOLO', icon: 'fas fa-user' },
    { key: '1v1', label: '1v1', icon: 'fas fa-fist-raised' },
    { key: '2v2', label: '2v2', icon: 'fas fa-users' },
    { key: '5v5', label: '5v5', icon: 'fas fa-gamepad' },
    { key: 'battle', label: 'ROYALE', icon: 'fas fa-crown' }
]

export const modeStats = {
    solo: { online: '892', rating: '8750', lobbies: '12' },
    '1v1': { online: '2.3k', rating: '9842', lobbies: '47' },
    '2v2': { online: '3.1k', rating: '10234', lobbies: '89' },
    '5v5': { online: '5.7k', rating: '15200', lobbies: '126' },
    battle: { online: '9.9k', rating: '21040', lobbies: '312' }
}