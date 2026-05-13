export const dashboardMetrics = [
  { key: 'visits', label: 'Посещения', value: '48 620', trend: '+12.4%', tone: 'good' },
  { key: 'activePlayers', label: 'Активные игроки', value: '1 284', trend: '+7.8%', tone: 'good' },
  { key: 'sessions', label: 'Активные сеансы', value: '326', trend: 'онлайн', tone: 'neutral' },
  { key: 'rooms', label: 'Активные комнаты', value: '42', trend: '18 игр', tone: 'neutral' },
  { key: 'games', label: 'Игр за период', value: '9 731', trend: '+16.1%', tone: 'good' },
]

export const visitSeries = [
  { label: 'Пн', visits: 4200, games: 720 },
  { label: 'Вт', visits: 5100, games: 860 },
  { label: 'Ср', visits: 4800, games: 810 },
  { label: 'Чт', visits: 6200, games: 1120 },
  { label: 'Пт', visits: 7600, games: 1350 },
  { label: 'Сб', visits: 8900, games: 1640 },
  { label: 'Вс', visits: 7820, games: 1410 },
]

export const modeStats = [
  { label: '1v1', value: 38, games: 3698 },
  { label: '2v2', value: 24, games: 2335 },
  { label: '5v5', value: 14, games: 1362 },
  { label: 'Royale', value: 17, games: 1654 },
  { label: 'Solo', value: 7, games: 682 },
]

export const liveRooms = [
  { room: 'R-4821', mode: '1v1', status: 'playing', players: '2/2', duration: '06:42' },
  { room: 'R-4819', mode: '2v2', status: 'waiting', players: '3/4', duration: '02:18' },
  { room: 'R-4807', mode: 'royale', status: 'playing', players: '8/10', duration: '11:05' },
  { room: 'R-4803', mode: '5v5', status: 'waiting', players: '7/10', duration: '04:51' },
]
