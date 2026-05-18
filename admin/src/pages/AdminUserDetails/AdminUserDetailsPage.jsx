import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { resourcesAPI } from '@/shared/api/resources'
import { notify } from '@/shared/lib/notify.js'
import './AdminUserDetailsPage.css'

const AUTH_LOGS_LIMIT = 10

export function AdminUserDetailsPage() {
  const { userId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const authQuery = useMemo(() => ({
    auth_page: searchParams.get('auth_page') || '1',
    auth_limit: AUTH_LOGS_LIMIT,
    auth_event_type: searchParams.get('auth_event_type') || '',
    auth_created_from: searchParams.get('auth_created_from') || '',
    auth_created_to: searchParams.get('auth_created_to') || '',
  }), [searchParams])

  useEffect(() => {
    let isActive = true

    const loadUser = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await resourcesAPI.getUserDetails(userId, authQuery)

        if (isActive) {
          setData(response)
        }
      } catch (requestError) {
        const message = requestError.message || 'Не удалось загрузить пользователя'

        if (isActive) {
          setError(message)
        }

        notify.error(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isActive = false
    }
  }, [authQuery, userId])

  const setAuthParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams)

    if (value) {
      nextParams.set(key, value)
    } else {
      nextParams.delete(key)
    }

    nextParams.set('auth_page', '1')
    setSearchParams(nextParams)
  }

  const setAuthPage = (page) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('auth_page', String(page))
    setSearchParams(nextParams)
  }

  const clearAuthFilters = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('auth_event_type')
    nextParams.delete('auth_created_from')
    nextParams.delete('auth_created_to')
    nextParams.set('auth_page', '1')
    setSearchParams(nextParams)
  }

  const cards = useMemo(() => {
    const rankStats = data?.rankStats || {}
    const stats = data?.stats || {}

    return [
      { label: 'MMR', value: rankStats.mmr ?? 1000, hint: 'Скрытый рейтинг подбора' },
      { label: 'RP', value: rankStats.rankPoints ?? 0, hint: rankStats.rank?.label || 'Ранг не рассчитан' },
      { label: 'Победы', value: rankStats.wins ?? 0, hint: `${rankStats.winRate ?? 0}% побед` },
      { label: 'Поражения', value: rankStats.losses ?? 0, hint: `${rankStats.draws ?? 0} ничьих` },
      { label: 'Матчи', value: rankStats.totalMatches ?? stats.totalGames ?? 0, hint: 'Ranked и история игрока' },
      { label: 'Solo рекорд', value: rankStats.bestSoloScore ?? 0, hint: `${stats.linesCleared ?? 0} линий всего` },
    ]
  }, [data])

  if (isLoading) {
    return (
      <section className="admin-page admin-user-details">
        <div className="admin-panel admin-user-details__state">Загружаем профиль пользователя...</div>
      </section>
    )
  }

  if (error || !data?.user) {
    return (
      <section className="admin-page admin-user-details">
        <div className="admin-panel admin-user-details__state">
          <strong>Пользователь не открыт</strong>
          <span>{error || 'Данные пользователя не найдены'}</span>
          <Link className="admin-button" to="/users">Вернуться к пользователям</Link>
        </div>
      </section>
    )
  }

  const { user, rankStats, stats, matches, ratingHistory, authLogsPagination } = data

  return (
    <section className="admin-page admin-user-details">
      <header className="admin-page__header admin-user-details__hero">
        <div className="admin-user-details__identity">
          <UserAvatar src={user.avatar_url} name={user.username} />
          <div>
            <p className="admin-page__eyebrow">Пользователь #{user.id}</p>
            <h1 className="admin-page__title">{user.username}</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="admin-user-details__hero-meta">
          <span className="cell-badge">{user.status}</span>
          <strong>{rankStats.rank?.label || 'Без ранга'}</strong>
          <small>Создан: {formatDate(user.created_at)}</small>
          <Link className="admin-button admin-button--primary" to={`/users/${user.id}/edit`}>Изменить</Link>
        </div>
      </header>

      <section className="admin-user-details__stats">
        {cards.map((card) => (
          <article className="admin-stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{Number(card.value).toLocaleString('ru-RU')}</strong>
            <p>{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="admin-user-details__grid">
        <article className="admin-panel">
          <h2 className="admin-panel__title">Информация</h2>
          <div className="admin-user-details__rows">
            <Detail label="ID" value={user.id} />
            <Detail label="Роль" value={`${user.role_name || user.role || 'user'} (#${user.role_id})`} />
            <Detail label="Email подтверждён" value={user.email_verified_at ? formatDate(user.email_verified_at) : 'Нет'} />
            <Detail label="Последний вход" value={formatDate(user.last_login_at)} />
            <Detail label="Обновлён" value={formatDate(user.updated_at)} />
            <Detail label="Средний счёт" value={stats.avgScore || 0} />
          </div>
        </article>

        <article className="admin-panel">
          <h2 className="admin-panel__title">История рейтинга</h2>
          <div className="admin-user-details__rating-list">
            {ratingHistory?.length ? ratingHistory.map((item) => (
              <Link key={item.id} to={item.match_id ? `/matches/${item.match_id}` : '#'} className="admin-user-details__rating-item">
                <span>{formatDate(item.created_at)}</span>
                <strong>{formatSigned(item.rank_delta)} RP</strong>
                <small>{formatSigned(item.mmr_delta)} MMR</small>
              </Link>
            )) : (
              <p className="admin-panel__empty">История рейтинга пока пустая</p>
            )}
          </div>
        </article>
      </section>

      <section className="admin-user-details__grid">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Способы входа</h2>
              <p className="admin-panel__caption">Пароль и подключённые внешние сервисы.</p>
            </div>
          </div>
          <div className="admin-user-details__login-list">
            <div className="admin-user-details__login-item">
              <span>password</span>
              <strong>{user.has_password ? 'Доступен' : 'Не установлен'}</strong>
              <small>{user.email || 'Почта не указана'}</small>
            </div>
            {data.accounts?.length ? data.accounts.map((account) => (
              <div className="admin-user-details__login-item" key={account.id}>
                <span>{account.provider}</span>
                <strong>{account.provider_account_id}</strong>
                <small>Подключён: {formatDate(account.created_at)}</small>
              </div>
            )) : (
              <p className="admin-panel__empty">Внешние сервисы входа не подключены</p>
            )}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">Auth события</h2>
              <p className="admin-panel__caption">Последние входы, выходы и события безопасности.</p>
            </div>
          </div>
          <div className="admin-user-details__auth-filters">
            <select
              aria-label="Тип auth события"
              value={searchParams.get('auth_event_type') || ''}
              onChange={(event) => setAuthParam('auth_event_type', event.target.value)}
            >
              <option value="">Все события</option>
              {(data.authEventTypes || []).map((eventType) => (
                <option key={eventType} value={eventType}>{eventType}</option>
              ))}
            </select>
            <input
              aria-label="Auth события с"
              type="datetime-local"
              value={searchParams.get('auth_created_from') || ''}
              onChange={(event) => setAuthParam('auth_created_from', event.target.value)}
            />
            <input
              aria-label="Auth события по"
              type="datetime-local"
              value={searchParams.get('auth_created_to') || ''}
              onChange={(event) => setAuthParam('auth_created_to', event.target.value)}
            />
            <button type="button" onClick={clearAuthFilters}>Сбросить</button>
          </div>
          <div className="admin-user-details__auth-list">
            {data.authLogs?.length ? data.authLogs.map((log) => (
              <article className="admin-user-details__auth-item" key={log.id}>
                <div>
                  <strong>{log.event_type}</strong>
                  <span>{formatDate(log.created_at)}</span>
                </div>
                <small>{log.ip_address || 'IP не записан'}</small>
                <code title={log.user_agent || ''}>{log.user_agent || 'User-Agent не записан'}</code>
              </article>
            )) : (
              <p className="admin-panel__empty">Auth события пока не записаны</p>
            )}
          </div>
          <AuthPagination pagination={authLogsPagination} onPageChange={setAuthPage} />
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">История игр</h2>
            <p className="admin-panel__caption">Нажмите на матч, чтобы открыть детальные записи игры.</p>
          </div>
        </div>
        <div className="admin-user-details__matches">
          {matches?.length ? matches.map((match) => (
            <Link className="admin-user-details__match" key={match.id} to={`/matches/${match.id}`}>
              <span>#{match.id}</span>
              <strong>{match.mode} · {match.matchType}</strong>
              <span className={`admin-user-details__result admin-user-details__result--${match.result}`}>
                {formatResult(match.result)}
              </span>
              <span>{match.score}:{match.opponentScore}</span>
              <small>{match.opponent}</small>
              <time>{formatDate(match.playedAt)}</time>
            </Link>
          )) : (
            <p className="admin-panel__empty">У пользователя пока нет записанных игр</p>
          )}
        </div>
      </section>
    </section>
  )
}

function Detail({ label, value }) {
  return (
    <div className="admin-user-details__row">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function UserAvatar({ src, name }) {
  const url = getAssetUrl(src)

  if (!url) {
    return <span className="admin-user-details__avatar">{String(name || '?').slice(0, 1).toUpperCase()}</span>
  }

  if (url.toLowerCase().includes('.webm')) {
    return (
      <span className="admin-user-details__avatar">
        <video src={url} autoPlay loop muted playsInline aria-label={name || 'Аватар'} />
      </span>
    )
  }

  return (
    <span className="admin-user-details__avatar">
      <img src={url} alt={name || 'Аватар'} />
    </span>
  )
}

function AuthPagination({ pagination, onPageChange }) {
  if (!pagination) {
    return null
  }

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || AUTH_LOGS_LIMIT)))
  const currentPage = pagination.page || 1

  return (
    <footer className="admin-user-details__auth-pagination">
      <span>{pagination.total || 0} записей</span>
      <div>
        <button
          disabled={currentPage <= 1}
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
        >
          Назад
        </button>
        <strong>{currentPage} / {totalPages}</strong>
        <button
          disabled={currentPage >= totalPages}
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
        >
          Вперед
        </button>
      </div>
    </footer>
  )
}

function getAssetUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const baseUrl = import.meta.env.VITE_API_URL || (
    typeof window !== 'undefined' && window.location.hostname
      ? `http://${window.location.hostname}:8880`
      : 'http://127.0.0.1:8880'
  )

  return `${baseUrl}${value}`
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatSigned(value) {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

function formatResult(result) {
  if (result === 'win') return 'Победа'
  if (result === 'draw') return 'Ничья'
  return 'Поражение'
}
