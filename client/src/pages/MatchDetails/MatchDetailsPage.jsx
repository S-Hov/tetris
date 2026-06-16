import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocalizedPath } from '@/i18n'
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
    const { t, i18n } = useTranslation()
    const [data, setData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

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
                    setError(requestError?.message || t('matches.details.loadError'))
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
    }, [matchId, t])

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
                            <h1>{t('matches.details.openErrorTitle')}</h1>
                            <p>{error}</p>
                            <Link to={getLocalizedPath('/matches', currentLanguage)} className="button">{t('matches.details.backToMatches')}</Link>
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
                                            {getMatchModeLabel(data.match.mode, t)}
                                        </div>
                                        <h1>{t('matches.details.title', { id: data.match.id })}</h1>
                                        <p>{t('matches.details.description')}</p>
                                    </div>

                                    <div className={`match-details-result-badge match-details-result-badge--${getMatchResultClass(data.match.result)}`}>
                                        <span>{formatMatchResultLabel(data.match.result, t)}</span>
                                        <strong>{winnerTeam ? t('matches.details.winnerTeam', { team: winnerTeam.teamNumber }) : t('matches.common.noWinner')}</strong>
                                    </div>
                                </div>
                            </GlowEffect>
                        </section>

                        <section className="match-details-meta-grid">
                            <MetaCard icon="fas fa-calendar" label={t('matches.details.startedAt')} value={formatFullDate(data.match.startedAt || data.match.createdAt, currentLanguage, t)} />
                            <MetaCard icon="fas fa-hourglass-half" label={t('matches.details.duration')} value={formatDuration(data.match.durationSeconds, t)} />
                            <MetaCard icon="fas fa-trophy" label={t('matches.details.result')} value={winnerTeam ? t('matches.details.winnerResult', { team: winnerTeam.teamNumber }) : t('matches.details.finishedNoWinner')} />
                            <MetaCard icon="fas fa-hashtag" label={t('matches.common.roomId')} value={data.match.roomId || t('matches.common.noRoom')} />
                        </section>

                        <section className="match-details-scoreboard">
                            <GlowEffect>
                                <div className="glow-effect match-details-scoreboard-content">
                                    <div className="profile-section-title">
                                        <i className="fas fa-chart-simple"></i>
                                        {t('matches.details.scoreTitle')}
                                    </div>

                                    <div className="match-details-teams-grid">
                                        {data.teams.map((team) => (
                                            <article
                                                key={team.id}
                                                className={`match-details-team-card match-details-team-card--${getTeamAccentClass(team.teamNumber)}`}
                                            >
                                                <span className="match-details-team-name">
                                                    {t('matches.details.teamName', { team: team.teamNumber })}
                                                    {team.isWinner ? ` • ${t('matches.common.winner')}` : ''}
                                                </span>
                                                <strong className="match-details-team-score">{team.teamScore}</strong>
                                                <p className="match-details-team-players">
                                                    {team.players.map((player) => player.nickname).join(', ') || t('matches.common.noPlayers')}
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
                                        {t('matches.details.playersTitle')}
                                    </div>

                                    <div className="match-details-table-scroll">
                                        <table className="match-details-table">
                                            <thead>
                                                <tr>
                                                    <th>{t('matches.details.headers.player')}</th>
                                                    <th>{t('matches.details.headers.team')}</th>
                                                    <th>{t('matches.details.headers.result')}</th>
                                                    <th>{t('matches.details.headers.score')}</th>
                                                    <th>{t('matches.details.headers.lines')}</th>
                                                    <th>{t('matches.details.headers.level')}</th>
                                                    <th>{t('matches.details.headers.status')}</th>
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
                                                                {formatMatchResultLabel(player.result, t)}
                                                            </span>
                                                        </td>
                                                        <td>{player.score}</td>
                                                        <td>{player.linesCleared}</td>
                                                        <td>{player.levelReached}</td>
                                                        <td>{player.leftAt ? t('matches.common.leftMatch') : (player.isRegistered ? t('matches.common.registered') : t('matches.common.guest'))}</td>
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
                                        {t('matches.details.timelineTitle')}
                                    </div>

                                    {data.events.length > 0 ? (
                                        <div className="match-details-timeline">
                                            {data.events.map((event) => (
                                                <article key={event.id} className="match-details-timeline-item">
                                                    <div className="match-details-timeline-icon">
                                                        <i className={getTimelineIcon(event.eventType)}></i>
                                                    </div>
                                                    <div className="match-details-timeline-body">
                                                        <strong>{describeTimelineEvent(event, t)}</strong>
                                                        <span>{formatFullDate(event.createdAt, currentLanguage, t)}</span>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="match-details-empty">
                                            <i className="fas fa-stream"></i>
                                            <strong>{t('matches.details.emptyEventsTitle')}</strong>
                                            <p>{t('matches.details.emptyEventsText')}</p>
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
