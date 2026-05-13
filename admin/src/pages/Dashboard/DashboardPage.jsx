import { useEffect, useMemo, useState } from 'react'
import { dashboardAPI } from '@/shared/api/dashboard'
import { dashboardMetrics as fallbackMetrics, liveRooms, modeStats as fallbackModes, visitSeries as fallbackSeries } from '@/shared/config/dashboardMock.js'
import { notify } from '@/shared/lib/notify.js'
import './DashboardPage.css'

const periodOptions = [
  { key: 'month', label: 'Месяц', groupBy: 'week' },
  { key: 'week', label: 'Неделя', groupBy: 'day' },
  { key: 'date', label: 'Дата', groupBy: 'day' },
]

export function DashboardPage() {
  const [period, setPeriod] = useState('week')
  const [range, setRange] = useState({ from: '', to: '' })
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const activePeriod = periodOptions.find((option) => option.key === period) || periodOptions[1]

  useEffect(() => {
    let isActive = true

    const loadDashboard = async () => {
      setIsLoading(true)

      try {
        const response = await dashboardAPI.getOverview({
          period,
          groupBy: activePeriod.groupBy,
          from: range.from,
          to: range.to,
        })

        if (isActive) {
          setDashboard(response)
        }
      } catch (error) {
        notify.error(error.message || 'Не удалось загрузить статистику')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isActive = false
    }
  }, [activePeriod.groupBy, period, range.from, range.to])

  const metrics = useMemo(() => buildMetrics(dashboard?.metrics), [dashboard])
  const visitSeries = useMemo(() => buildVisitSeries(dashboard), [dashboard])
  const modeStats = useMemo(() => buildModeStats(dashboard), [dashboard])
  const maxVisits = Math.max(1, ...visitSeries.map((item) => item.visits))
  const maxGames = Math.max(1, ...visitSeries.map((item) => item.games))

  const handleRangeChange = (key, value) => {
    setRange((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="dashboard-page__eyebrow">Администрирование</p>
          <h1>Операционный дашборд</h1>
        </div>
        <div className="dashboard-page__filters" aria-label="Период статистики">
          {periodOptions.map((option) => (
            <button
              className={period === option.key ? 'is-active' : ''}
              key={option.key}
              type="button"
              onClick={() => setPeriod(option.key)}
            >
              {option.label}
            </button>
          ))}
          <input
            aria-label="Дата начала"
            onChange={(event) => handleRangeChange('from', event.target.value)}
            type="date"
            value={range.from}
          />
          <input
            aria-label="Дата окончания"
            onChange={(event) => handleRangeChange('to', event.target.value)}
            type="date"
            value={range.to}
          />
        </div>
      </header>

      <div className="dashboard-page__metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.key}>
            <span>{metric.label}</span>
            <strong>{isLoading ? '...' : metric.value}</strong>
            <small className={`metric-card__trend metric-card__trend--${metric.tone}`}>{metric.trend}</small>
          </article>
        ))}
      </div>

      <div className="dashboard-page__grid">
        <section className="analytics-panel analytics-panel--wide">
          <div className="analytics-panel__header">
            <div>
              <h2>Посещения и игры</h2>
              <p>Группировка переключается по месяцу, неделе или диапазону дат.</p>
            </div>
            <span>/api/admin/dashboard</span>
          </div>
          <div className="dual-chart" aria-label="График посещений и игр">
            {visitSeries.map((point) => (
              <div className="dual-chart__column" key={point.label}>
                <div className="dual-chart__bars">
                  <span
                    className="dual-chart__bar dual-chart__bar--visits"
                    style={{ height: `${(point.visits / maxVisits) * 100}%` }}
                    title={`${point.visits} посещений`}
                  />
                  <span
                    className="dual-chart__bar dual-chart__bar--games"
                    style={{ height: `${(point.games / maxGames) * 100}%` }}
                    title={`${point.games} игр`}
                  />
                </div>
                <span className="dual-chart__label">{point.label}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span><i className="chart-legend__visits" />Посещения</span>
            <span><i className="chart-legend__games" />Игры</span>
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel__header">
            <div>
              <h2>Режимы</h2>
              <p>Доля сыгранных матчей за период.</p>
            </div>
          </div>
          <div className="mode-list">
            {modeStats.map((mode) => (
              <div className="mode-list__row" key={mode.label}>
                <div>
                  <strong>{mode.label}</strong>
                  <span>{mode.games.toLocaleString('ru-RU')} игр</span>
                </div>
                <div className="mode-list__track">
                  <span style={{ width: `${mode.value}%` }} />
                </div>
                <b>{mode.value}%</b>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-panel analytics-panel--wide">
          <div className="analytics-panel__header">
            <div>
              <h2>Активные комнаты</h2>
              <p>Оперативный срез комнат и игр. Табличные разделы ниже уже подключены к API.</p>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table__head">
              <span>Комната</span>
              <span>Режим</span>
              <span>Статус</span>
              <span>Игроки</span>
              <span>Длительность</span>
            </div>
            {liveRooms.map((room) => (
              <div className="admin-table__row" key={room.room}>
                <span>{room.room}</span>
                <span>{room.mode}</span>
                <span className={`status-pill status-pill--${room.status}`}>{room.status}</span>
                <span>{room.players}</span>
                <span>{room.duration}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function buildMetrics(metrics) {
  if (!metrics) {
    return fallbackMetrics
  }

  return [
    { key: 'visits', label: 'Посещения', value: metrics.visits.toLocaleString('ru-RU'), trend: 'за период', tone: 'neutral' },
    { key: 'activePlayers', label: 'Активные игроки', value: metrics.activePlayers.toLocaleString('ru-RU'), trend: `${metrics.totalUsers} всего`, tone: 'good' },
    { key: 'sessions', label: 'Активные сеансы', value: metrics.activeSessions.toLocaleString('ru-RU'), trend: 'онлайн', tone: 'neutral' },
    { key: 'rooms', label: 'Активные комнаты', value: metrics.activeRooms.toLocaleString('ru-RU'), trend: `${metrics.activeGames} игр`, tone: 'neutral' },
    { key: 'games', label: 'Игр за период', value: metrics.playedGames.toLocaleString('ru-RU'), trend: 'создано', tone: 'good' },
  ]
}

function buildVisitSeries(dashboard) {
  const gamesByBucket = new Map((dashboard?.charts?.games || []).map((item) => [String(item.bucket), item.games]))
  const visits = dashboard?.charts?.visits || []

  if (visits.length === 0 && (dashboard?.charts?.games || []).length === 0) {
    return fallbackSeries
  }

  const buckets = visits.length > 0 ? visits : dashboard.charts.games

  return buckets.map((item) => ({
    label: formatBucket(item.bucket),
    visits: Number(item.visits || 0),
    games: Number(item.games ?? gamesByBucket.get(String(item.bucket)) ?? 0),
  }))
}

function buildModeStats(dashboard) {
  const modes = dashboard?.charts?.modes || []
  const total = modes.reduce((sum, item) => sum + Number(item.games || 0), 0)

  if (total === 0) {
    return fallbackModes
  }

  return modes.map((item) => ({
    label: item.mode,
    games: Number(item.games || 0),
    value: Math.round((Number(item.games || 0) / total) * 100),
  }))
}

function formatBucket(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}
