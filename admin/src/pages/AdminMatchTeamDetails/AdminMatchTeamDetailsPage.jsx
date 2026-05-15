import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { resourcesAPI } from '@/shared/api/resources'
import { notify } from '@/shared/lib/notify.js'
import './AdminMatchTeamDetailsPage.css'

export function AdminMatchTeamDetailsPage() {
  const { teamId } = useParams()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const loadTeam = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await resourcesAPI.getMatchTeamDetails(teamId)

        if (isActive) {
          setData(response)
        }
      } catch (requestError) {
        const message = requestError.message || 'Не удалось загрузить команду матча'

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

    loadTeam()

    return () => {
      isActive = false
    }
  }, [teamId])

  const totals = useMemo(() => {
    const players = data?.players || []

    return {
      players: players.length,
      score: players.reduce((sum, player) => sum + Number(player.score || 0), 0),
      lines: players.reduce((sum, player) => sum + Number(player.lines_cleared || 0), 0),
      bestLevel: players.reduce((max, player) => Math.max(max, Number(player.level_reached || 1)), 1),
    }
  }, [data?.players])

  if (isLoading) {
    return (
      <section className="admin-page admin-team-details">
        <div className="admin-panel admin-team-details__state">Загружаем команду матча...</div>
      </section>
    )
  }

  if (error || !data?.team) {
    return (
      <section className="admin-page admin-team-details">
        <div className="admin-panel admin-team-details__state">
          <strong>Команда не открыта</strong>
          <span>{error || 'Команда матча не найдена'}</span>
          <Link className="admin-button" to="/matches/teams">Вернуться к командам</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page admin-team-details">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Команда #{data.team.id}</p>
          <h1 className="admin-page__title">Команда {data.team.team_number}</h1>
          <p className="admin-page__description">
            Состав команды, ссылки на игроков и индивидуальные результаты в матче.
          </p>
        </div>
        <div className="admin-team-details__header-meta">
          <span className="cell-badge">{data.team.result}</span>
          <strong>{data.team.team_score.toLocaleString('ru-RU')} очков</strong>
          <Link className="admin-button" to={`/matches/${data.match.id}`}>Матч #{data.match.id}</Link>
        </div>
      </header>

      <section className="admin-match-details__stats">
        <Meta label="Игроков" value={totals.players} />
        <Meta label="Счёт игроков" value={totals.score.toLocaleString('ru-RU')} />
        <Meta label="Линии" value={totals.lines.toLocaleString('ru-RU')} />
        <Meta label="Макс. уровень" value={totals.bestLevel} />
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">Игроки команды</h2>
            <p className="admin-panel__caption">ID и ник ведут на страницу пользователя, если игрок зарегистрирован.</p>
          </div>
        </div>
        <div className="admin-team-details__players">
          {data.players.length ? data.players.map((player) => (
            <article className="admin-team-details__player" key={player.id}>
              <PlayerAvatar src={player.avatar_url} name={player.nickname} />
              <div className="admin-team-details__player-main">
                <div>
                  {player.user_id ? (
                    <Link to={`/users/${player.user_id}`}>#{player.user_id}</Link>
                  ) : (
                    <span className="cell-muted">Гость</span>
                  )}
                  {player.user_id ? (
                    <Link to={`/users/${player.user_id}`}>{player.nickname}</Link>
                  ) : (
                    <strong>{player.nickname}</strong>
                  )}
                </div>
                <small>{player.email || (player.is_registered ? 'Почта не записана' : 'Незарегистрированный игрок')}</small>
              </div>
              <span className={`admin-team-details__result admin-team-details__result--${player.result}`}>
                {formatResult(player.result)}
              </span>
              <strong>{Number(player.score).toLocaleString('ru-RU')}</strong>
              <small>{player.lines_cleared} линий · уровень {player.level_reached}</small>
            </article>
          )) : (
            <p className="admin-panel__empty">Игроки команды не записаны</p>
          )}
        </div>
      </section>
    </section>
  )
}

function Meta({ label, value }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function PlayerAvatar({ src, name }) {
  const url = getAssetUrl(src)

  if (!url) {
    return <span className="admin-team-details__avatar">{String(name || '?').slice(0, 1).toUpperCase()}</span>
  }

  if (url.toLowerCase().includes('.webm')) {
    return (
      <span className="admin-team-details__avatar">
        <video src={url} autoPlay loop muted playsInline aria-label={name || 'Аватар'} />
      </span>
    )
  }

  return (
    <span className="admin-team-details__avatar">
      <img src={url} alt={name || 'Аватар'} />
    </span>
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

function formatResult(result) {
  if (result === 'win') return 'Победа'
  if (result === 'draw') return 'Ничья'
  if (result === 'none') return 'Нет итога'
  return 'Поражение'
}
