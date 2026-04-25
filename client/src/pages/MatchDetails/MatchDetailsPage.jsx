import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { matchesAPI } from '@/shared/api/matches'
import {
    describeTimelineEvent,
    formatDuration,
    formatFullDate,
    formatMatchResultLabel,
    getMatchModeIcon,
    getMatchModeLabel,
    getMatchResultClass,
    getTeamAccentClass,
    getTimelineIcon,
} from '@/shared/lib/matches/presentation.js'
import './MatchDetailsPage.css'

const MatchDetailsPage = () => {
    const { matchId } = useParams()
    const [data, setData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        const loadDetails = async () => {
            setIsLoading(true)
            setError('')

            try {
                const response = await matchesAPI.getById(matchId)

                if (!cancelled) {
                    setData(response)
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError?.message || 'Не удалось загрузить детали матча')
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        loadDetails()

        return () => {
            cancelled = true
        }
    }, [matchId])

    const winnerTeam = useMemo(
        () => data?.teams?.find((team) => team.isWinner) || null,
        [data]
    )

    return (
        <section className="section match-details-page">
            <div className="container match-details-container">
                {error ? (
                    <GlowEffect className="match-details-error-shell">
                        <div className="glow-effect match-details-error">
                            <i className="fas fa-triangle-exclamation"></i>
                            <h1>Не удалось открыть матч</h1>
                            <p>{error}</p>
                            <Link to="/matches" className="button">Вернуться к матчам</Link>
                        </div>
                    </GlowEffect>
                ) : null}

                {!error && isLoading ? (
                    <div className="match-details-skeletons">
                        <div className="match-details-skeleton match-details-skeleton--hero" />
                        <div className="match-details-skeleton match-details-skeleton--board" />
                        <div className="match-details-skeleton match-details-skeleton--table" />
                    </div>
                ) : null}

                {!error && !isLoading && data ? (
                    <>
                        <section className="match-details-hero">
                            <GlowEffect>
                                <div className="glow-effect match-details-hero-content">
                                    <div className="match-details-headline">
                                        <div className="match-details-kicker">
                                            <i className={getMatchModeIcon(data.match.mode)}></i>
                                            {getMatchModeLabel(data.match.mode)}
                                        </div>
                                        <h1>Матч #{data.match.id}</h1>
                                        <p>Подробная карточка боя с реальными данными по командам, игрокам и журналу событий.</p>
                                    </div>

                                    <div className={`match-details-result-badge match-details-result-badge--${getMatchResultClass(data.match.result)}`}>
                                        <span>{formatMatchResultLabel(data.match.result)}</span>
                                        <strong>{winnerTeam ? `Команда ${winnerTeam.teamNumber}` : 'Без победителя'}</strong>
                                    </div>
                                </div>
                            </GlowEffect>
                        </section>

                        <section className="match-details-meta-grid">
                            <MetaCard icon="fas fa-calendar" label="Начало матча" value={formatFullDate(data.match.startedAt || data.match.createdAt)} />
                            <MetaCard icon="fas fa-hourglass-half" label="Длительность" value={formatDuration(data.match.durationSeconds)} />
                            <MetaCard icon="fas fa-trophy" label="Итог" value={winnerTeam ? `Победила команда ${winnerTeam.teamNumber}` : 'Матч завершён без победителя'} />
                            <MetaCard icon="fas fa-hashtag" label="Room ID" value={data.match.roomId || 'Нет данных'} />
                        </section>

                        <section className="match-details-scoreboard">
                            <GlowEffect>
                                <div className="glow-effect match-details-scoreboard-content">
                                    <div className="profile-section-title">
                                        <i className="fas fa-chart-simple"></i>
                                        Итоговый счёт
                                    </div>

                                    <div className="match-details-teams-grid">
                                        {data.teams.map((team) => (
                                            <article
                                                key={team.id}
                                                className={`match-details-team-card match-details-team-card--${getTeamAccentClass(team.teamNumber)}`}
                                            >
                                                <span className="match-details-team-name">
                                                    Команда {team.teamNumber}
                                                    {team.isWinner ? ' • Победитель' : ''}
                                                </span>
                                                <strong className="match-details-team-score">{team.teamScore}</strong>
                                                <p className="match-details-team-players">
                                                    {team.players.map((player) => player.nickname).join(', ') || 'Игроки не найдены'}
                                                </p>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            </GlowEffect>
                        </section>

                        <section className="match-details-table-section">
                            <GlowEffect>
                                <div className="glow-effect match-details-table-content">
                                    <div className="profile-section-title">
                                        <i className="fas fa-user-friends"></i>
                                        Игроки матча
                                    </div>

                                    <div className="match-details-table-scroll">
                                        <table className="match-details-table">
                                            <thead>
                                                <tr>
                                                    <th>Игрок</th>
                                                    <th>Команда</th>
                                                    <th>Результат</th>
                                                    <th>Счёт</th>
                                                    <th>Линии</th>
                                                    <th>Уровень</th>
                                                    <th>Статус</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.players.map((player) => (
                                                    <tr key={player.id}>
                                                        <td>{player.nickname}</td>
                                                        <td>
                                                            <span className={`match-details-team-pill match-details-team-pill--${getTeamAccentClass(getTeamNumberByTeamId(data.teams, player.teamId))}`}>
                                                                T{getTeamNumberByTeamId(data.teams, player.teamId)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`match-details-player-result match-details-player-result--${getMatchResultClass(player.result)}`}>
                                                                {formatMatchResultLabel(player.result)}
                                                            </span>
                                                        </td>
                                                        <td>{player.score}</td>
                                                        <td>{player.linesCleared}</td>
                                                        <td>{player.levelReached}</td>
                                                        <td>{player.leftAt ? 'Покинул матч' : (player.isRegistered ? 'Зарегистрирован' : 'Гость')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </GlowEffect>
                        </section>

                        <section className="match-details-timeline-section">
                            <GlowEffect>
                                <div className="glow-effect match-details-timeline-content">
                                    <div className="profile-section-title">
                                        <i className="fas fa-clock"></i>
                                        Хронология матча
                                    </div>

                                    {data.events.length > 0 ? (
                                        <div className="match-details-timeline">
                                            {data.events.map((event) => (
                                                <article key={event.id} className="match-details-timeline-item">
                                                    <div className="match-details-timeline-icon">
                                                        <i className={getTimelineIcon(event.eventType)}></i>
                                                    </div>
                                                    <div className="match-details-timeline-body">
                                                        <strong>{describeTimelineEvent(event)}</strong>
                                                        <span>{formatFullDate(event.createdAt)}</span>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="match-details-empty">
                                            <i className="fas fa-stream"></i>
                                            <strong>События матча не записаны</strong>
                                            <p>Матч сохранён корректно, но журнал игровых событий пока пуст.</p>
                                        </div>
                                    )}
                                </div>
                            </GlowEffect>
                        </section>
                    </>
                ) : null}
            </div>
        </section>
    )
}

const MetaCard = ({ icon, label, value }) => (
    <GlowEffect className="match-details-meta-card">
        <div className="glow-effect match-details-meta-card__inner">
            <div>
                <i className={icon}></i>
                <span>{label}</span>
            </div>
            <strong>{value}</strong>
        </div>
    </GlowEffect>
)

const getTeamNumberByTeamId = (teams, teamId) => {
    return teams.find((team) => team.id === teamId)?.teamNumber || 1
}

export default MatchDetailsPage
