import { useEffect, useMemo, useState } from 'react'
import { dashboardAPI } from '@/shared/api/dashboard'
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
  const [refreshToken, setRefreshToken] = useState(0)

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
  }, [activePeriod.groupBy, period, range.from, range.to, refreshToken])

  const metrics = useMemo(() => buildMetrics(dashboard?.metrics), [dashboard])
  const visitSeries = useMemo(() => buildVisitSeries(dashboard), [dashboard])
  const modeStats = useMemo(() => buildModeStats(dashboard), [dashboard])
  const seoSources = useMemo(() => dashboard?.seo?.sources || [], [dashboard])
  const seoPages = useMemo(() => dashboard?.seo?.pages || [], [dashboard])
  const activeRooms = useMemo(() => buildActiveRooms(dashboard?.live?.rooms), [dashboard])
  const maxVisits = Math.max(1, ...visitSeries.map((item) => item.visits))
  const maxGames = Math.max(1, ...visitSeries.map((item) => item.games))

  const handleRangeChange = (key, value) => {
    setRange((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return (
    <section className="admin-page dashboard-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Администрирование</p>
          <h1 className="admin-page__title">Операционный дашборд</h1>
        </div>
        <div className="admin-page__actions">
          <div className="admin-toolbar dashboard-page__filters" aria-label="Период статистики">
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
          <button
            className="admin-button admin-button--primary"
            disabled={isLoading}
            type="button"
            onClick={() => setRefreshToken((value) => value + 1)}
          >
            Обновить данные
          </button>
        </div>
      </header>

      <div className="admin-stats-grid">
        {metrics.map((metric) => (
          <article className="admin-stat-card" key={metric.key}>
            <span>{metric.label}</span>
            <strong>{isLoading ? '...' : metric.value}</strong>
            <small className={`admin-stat-card__trend admin-stat-card__trend--${metric.tone}`}>{metric.trend}</small>
          </article>
        ))}
      </div>

      <div className="dashboard-page__grid">
        <section className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Посещения и игры</h2>
              <p className="admin-panel__caption">Динамика визитов и созданных матчей за выбранный период.</p>
            </div>
            <span>/api/admin/dashboard</span>
          </div>
          {visitSeries.length > 0 ? (
            <>
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
            </>
          ) : (
            <EmptyState text="За выбранный период данных пока нет" />
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Режимы</h2>
              <p className="admin-panel__caption">Доля сыгранных матчей за период.</p>
            </div>
          </div>
          {modeStats.length > 0 ? (
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
          ) : (
            <EmptyState text="Матчи пока не найдены" />
          )}
        </section>

        <RankingPanel
          title="SEO: источники трафика"
          caption="Каналы и рефереры, которые привели пользователей."
          items={seoSources}
          labelKey="source"
          emptyText="Источники появятся после первых посещений"
        />

        <RankingPanel
          title="SEO: популярные страницы"
          caption="Страницы с наибольшим числом визитов."
          items={seoPages}
          labelKey="path"
          linkItems
          emptyText="Популярные страницы пока не определены"
        />

        <section className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Активные комнаты</h2>
              <p className="admin-panel__caption">Живой срез комнат, игроков и текущих матчей.</p>
            </div>
          </div>
          <div className="admin-inline-table">
            <div className="admin-inline-table__head">
              <span>Комната</span>
              <span>Режим</span>
              <span>Статус</span>
              <span>Игроки</span>
              <span>Длительность</span>
            </div>
            {activeRooms.length > 0 ? (
              activeRooms.map((room) => (
                <div className="admin-inline-table__row" key={room.id}>
                  <span>{room.id}</span>
                  <span>{room.mode}</span>
                  <span className={`admin-status-pill admin-status-pill--${room.status}`}>{room.status}</span>
                  <span>{room.players}</span>
                  <span>{room.duration}</span>
                </div>
              ))
            ) : (
              <div className="admin-inline-table__empty">Активных комнат сейчас нет</div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

function RankingPanel({ title, caption, items, labelKey, emptyText, linkItems = false }) {
  const maxValue = Math.max(1, ...items.map((item) => Number(item.visits || 0)))

  return (
    <section className="admin-panel">
      <div className="admin-panel__header">
        <div>
          <h2 className="admin-panel__title">{title}</h2>
          <p className="admin-panel__caption">{caption}</p>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="ranking-list">
          {items.map((item) => (
            <div className="ranking-list__row" key={item[labelKey]}>
              <div>
                {linkItems ? (
                  <a
                    className="admin-table-link"
                    href={normalizePageHref(item[labelKey])}
                    target="_blank"
                    rel="noreferrer"
                    title={item[labelKey]}
                  >
                    {item[labelKey]}
                  </a>
                ) : (
                  <strong title={item[labelKey]}>{item[labelKey]}</strong>
                )}
                <span>{Number(item.sessions || 0).toLocaleString('ru-RU')} сеансов</span>
              </div>
              <div className="ranking-list__track">
                <span style={{ width: `${(Number(item.visits || 0) / maxValue) * 100}%` }} />
              </div>
              <b>{Number(item.visits || 0).toLocaleString('ru-RU')}</b>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text={emptyText} />
      )}
    </section>
  )
}

function normalizePageHref(value) {
  const path = String(value || '/')

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const clientOrigin = getClientOrigin()

  return clientOrigin ? `${clientOrigin}${normalizedPath}` : normalizedPath
}

function getClientOrigin() {
  if (import.meta.env.VITE_CLIENT_URL) {
    return import.meta.env.VITE_CLIENT_URL.replace(/\/+$/, '')
  }

  if (typeof window === 'undefined') {
    return ''
  }

  if (window.location.port === '5174') {
    return `${window.location.protocol}//${window.location.hostname}:5173`
  }

  return window.location.origin
}

function EmptyState({ text }) {
  return <div className="admin-panel__empty">{text}</div>
}

function buildMetrics(metrics = {}) {
  const normalizedMetrics = {
    visits: 0,
    activePlayers: 0,
    activeSessions: 0,
    activeRooms: 0,
    activeGames: 0,
    playedGames: 0,
    totalUsers: 0,
    ...metrics,
  }

  return [
    { key: 'visits', label: 'Посещения', value: normalizedMetrics.visits.toLocaleString('ru-RU'), trend: 'за период', tone: 'neutral' },
    { key: 'activePlayers', label: 'Активные игроки', value: normalizedMetrics.activePlayers.toLocaleString('ru-RU'), trend: `${normalizedMetrics.totalUsers} всего`, tone: 'good' },
    { key: 'sessions', label: 'Активные сеансы', value: normalizedMetrics.activeSessions.toLocaleString('ru-RU'), trend: 'за 15 минут', tone: 'neutral' },
    { key: 'rooms', label: 'Активные комнаты', value: normalizedMetrics.activeRooms.toLocaleString('ru-RU'), trend: `${normalizedMetrics.activeGames} игр`, tone: 'neutral' },
    { key: 'games', label: 'Игр за период', value: normalizedMetrics.playedGames.toLocaleString('ru-RU'), trend: 'создано', tone: 'good' },
  ]
}

function buildVisitSeries(dashboard) {
  const gamesByBucket = new Map((dashboard?.charts?.games || []).map((item) => [String(item.bucket), item.games]))
  const visits = dashboard?.charts?.visits || []

  if (visits.length === 0 && (dashboard?.charts?.games || []).length === 0) {
    return []
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
    return []
  }

  return modes.map((item) => ({
    label: item.mode,
    games: Number(item.games || 0),
    value: Math.round((Number(item.games || 0) / total) * 100),
  }))
}

function buildActiveRooms(rooms = []) {
  return rooms.map((room) => ({
    id: room.id,
    mode: room.mode_key || '-',
    status: room.status || 'waiting',
    players: Number(room.players_count || 0).toLocaleString('ru-RU'),
    duration: formatDuration(Number(room.duration_seconds || 0)),
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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours} ч ${minutes % 60} мин`
  }

  return `${Math.max(1, minutes)} мин`
}
