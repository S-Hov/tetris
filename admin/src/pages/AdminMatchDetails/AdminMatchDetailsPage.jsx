import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { resourcesAPI } from '@/shared/api/resources'
import { notify } from '@/shared/lib/notify.js'
import './AdminMatchDetailsPage.css'

export function AdminMatchDetailsPage() {
  const { matchId } = useParams()
  const [data, setData] = useState({ match: null, teams: [], players: [], events: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const loadMatch = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [matches, teams, players, events] = await Promise.all([
          resourcesAPI.getMatchDetails(matchId),
          resourcesAPI.getList('matchTeams', { match_id: matchId, limit: 50 }),
          resourcesAPI.getList('matchPlayers', { match_id: matchId, limit: 100 }),
          resourcesAPI.getList('matchEvents', { match_id: matchId, limit: 100 }),
        ])

        if (isActive) {
          setData({
            match: matches.items?.[0] || null,
            teams: teams.items || [],
            players: players.items || [],
            events: events.items || [],
          })
        }
      } catch (requestError) {
        const message = requestError.message || 'Не удалось загрузить матч'

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

    loadMatch()

    return () => {
      isActive = false
    }
  }, [matchId])

  const winnerTeam = useMemo(
    () => data.teams.find((team) => team.id === data.match?.winner_team_id) || null,
    [data.match?.winner_team_id, data.teams]
  )

  if (isLoading) {
    return (
      <section className="admin-page admin-match-details">
        <div className="admin-panel admin-match-details__state">Загружаем записи матча...</div>
      </section>
    )
  }

  if (error || !data.match) {
    return (
      <section className="admin-page admin-match-details">
        <div className="admin-panel admin-match-details__state">
          <strong>Матч не открыт</strong>
          <span>{error || 'Запись матча не найдена'}</span>
          <Link className="admin-button" to="/matches">Вернуться к матчам</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page admin-match-details">
      <header className="admin-page__header admin-match-details__hero">
        <div>
          <p className="admin-page__eyebrow">Матч #{data.match.id}</p>
          <h1 className="admin-page__title">{data.match.mode} · {data.match.match_type}</h1>
          <p>Room ID: {data.match.room_id || 'нет данных'}</p>
        </div>
        <div className="admin-match-details__status">
          <span className="cell-badge">{data.match.status}</span>
          <strong>{winnerTeam ? `Победила команда ${winnerTeam.team_number}` : 'Победитель не указан'}</strong>
          <small>{formatDate(data.match.started_at || data.match.created_at)}</small>
        </div>
      </header>

      <section className="admin-match-details__stats">
        <Meta label="Рейтинг" value={data.match.counts_for_rating ? 'Да' : 'Нет'} />
        <Meta label="Онлайн" value={data.match.is_online ? 'Да' : 'Нет'} />
        <Meta label="Создан" value={formatDate(data.match.created_at)} />
        <Meta label="Завершён" value={formatDate(data.match.ended_at)} />
      </section>

      <section className="admin-match-details__grid">
        <article className="admin-panel">
          <h2 className="admin-panel__title">Команды</h2>
          <div className="admin-match-details__team-list">
            {data.teams.length ? data.teams.map((team) => (
              <div className="admin-match-details__team" key={team.id}>
                <span>Команда {team.team_number}</span>
                <strong>{team.team_score}</strong>
                <small>{team.result}</small>
              </div>
            )) : <p className="admin-panel__empty">Команды не записаны</p>}
          </div>
        </article>

        <article className="admin-panel">
          <h2 className="admin-panel__title">Игроки</h2>
          <div className="admin-match-details__players">
            {data.players.length ? data.players.map((player) => (
              <div className="admin-match-details__player" key={player.id}>
                <Link to={player.user_id ? `/users/${player.user_id}` : '#'}>{player.nickname || `Игрок #${player.id}`}</Link>
                <span>{player.result}</span>
                <strong>{Number(player.score).toLocaleString('ru-RU')}</strong>
                <small>{player.lines_cleared} линий · уровень {player.level_reached}</small>
              </div>
            )) : <p className="admin-panel__empty">Игроки не записаны</p>}
          </div>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">События матча</h2>
            <p className="admin-panel__caption">Сырые игровые записи и payload для аудита.</p>
          </div>
        </div>
        <div className="admin-match-details__events">
          {data.events.length ? data.events.map((event) => (
            <article className="admin-match-details__event" key={event.id}>
              <div>
                <strong>{event.event_type}</strong>
                <span>{formatDate(event.created_at)}</span>
              </div>
              <code>{JSON.stringify(event.payload || {})}</code>
            </article>
          )) : <p className="admin-panel__empty">События матча не записаны</p>}
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

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
