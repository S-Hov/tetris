import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocalizedPath } from '@/i18n'
import GlowEffect from '@/shared/ui/GlowEffect'
import ProfileSideNav from '@/widgets/ProfileSideNav'
import { matchesAPI } from '@/shared/api/matches'
import {
    formatMatchDate,
    formatMatchResultLabel,
    getMatchModeIcon,
    getMatchModeLabel,
    getMatchResultClass,
} from '@/shared/lib/matches/presentation.js'
import './MatchesPage.css'

const EMPTY_SUMMARY = {
    totalMatches: 0,
    wins: 0,
    losses: 0,
    avgLines: 0,
    winRate: 0,
}

const EMPTY_PAGINATION = {
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
}

const RESULT_FILTERS = [
    { key: 'all', labelKey: 'matches.list.filters.all' },
    { key: 'win', labelKey: 'matches.list.filters.win' },
    { key: 'loss', labelKey: 'matches.list.filters.loss' },
]

const MODE_FILTERS = [
    { key: 'all', labelKey: 'matches.list.filters.allModes' },
    { key: 'solo', label: 'Solo' },
    { key: '1v1', label: '1v1' },
    { key: '2v2', label: '2v2' },
    { key: '5v5', label: '5v5' },
    { key: 'royale', label: 'Royale' },
]

const MatchesPage = () => {
    const { t, i18n } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [resultFilter, setResultFilter] = useState(() => searchParams.get('result') || 'all')
    const [modeFilter, setModeFilter] = useState(() => searchParams.get('mode') || 'all')
    const [page, setPage] = useState(() => Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '')
    const deferredSearch = useDeferredValue(searchInput.trim())

    const [matchesData, setMatchesData] = useState({
        matches: [],
        summary: EMPTY_SUMMARY,
        pagination: EMPTY_PAGINATION,
    })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    useEffect(() => {
        const nextParams = new URLSearchParams()

        if (resultFilter !== 'all') {
            nextParams.set('result', resultFilter)
        }

        if (modeFilter !== 'all') {
            nextParams.set('mode', modeFilter)
        }

        if (page > 1) {
            nextParams.set('page', String(page))
        }

        if (deferredSearch) {
            nextParams.set('search', deferredSearch)
        }

        setSearchParams(nextParams, { replace: true })
    }, [deferredSearch, modeFilter, page, resultFilter, setSearchParams])

    useEffect(() => {
        let cancelled = false

        const loadMatches = async () => {
            setIsLoading(true)
            setError('')

            try {
                const response = await matchesAPI.getList({
                    page,
                    limit: 10,
                    result: resultFilter,
                    mode: modeFilter,
                    search: deferredSearch,
                })

                if (!cancelled) {
                    setMatchesData({
                        matches: Array.isArray(response.matches) ? response.matches : [],
                        summary: response.summary || EMPTY_SUMMARY,
                        pagination: response.pagination || EMPTY_PAGINATION,
                    })
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError?.message || t('matches.list.loadError'))
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        loadMatches()

        return () => {
            cancelled = true
        }
    }, [deferredSearch, modeFilter, page, resultFilter, t])

    const pageNumbers = useMemo(() => {
        const totalPages = matchesData.pagination.totalPages

        if (totalPages <= 1) {
            return []
        }

        return Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 7)
    }, [matchesData.pagination.totalPages])

    const handleResultFilterChange = (value) => {
        startTransition(() => {
            setResultFilter(value)
            setPage(1)
        })
    }

    const handleModeFilterChange = (value) => {
        startTransition(() => {
            setModeFilter(value)
            setPage(1)
        })
    }

    const handleSearchChange = (event) => {
        const value = event.target.value

        startTransition(() => {
            setSearchInput(value)
            setPage(1)
        })
    }

    return (
        <section className="section matches-page">
            <div className="container matches-container profile-layout-shell">
                <ProfileSideNav />

                <div className="matches-content profile-layout-content">
                    <section className="matches-hero">
                    <GlowEffect>
                        <div className="glow-effect matches-hero-content">
                            <div>
                                <p className="matches-eyebrow">{t('matches.list.eyebrow')}</p>
                                <h1>{t('matches.list.title')}</h1>
                                <p>{t('matches.list.description')}</p>
                            </div>
                            <div className="matches-hero-badge">
                                <i className="fas fa-history"></i>
                                <strong>{matchesData.pagination.totalCount}</strong>
                                <span>{t('matches.list.found')}</span>
                            </div>
                        </div>
                    </GlowEffect>
                    </section>

                    <section className="matches-filters">
                    <GlowEffect>
                        <div className="glow-effect matches-filters-content">
                            <div className="matches-filter-group">
                                {RESULT_FILTERS.map((filter) => (
                                    <button
                                        key={filter.key}
                                        type="button"
                                        className={`matches-filter-button ${resultFilter === filter.key ? 'matches-filter-button--active' : ''}`}
                                        onClick={() => handleResultFilterChange(filter.key)}
                                    >
                                        {t(filter.labelKey)}
                                    </button>
                                ))}
                            </div>

                            <div className="matches-filter-group">
                                {MODE_FILTERS.map((filter) => (
                                    <button
                                        key={filter.key}
                                        type="button"
                                        className={`matches-filter-button ${modeFilter === filter.key ? 'matches-filter-button--active' : ''}`}
                                        onClick={() => handleModeFilterChange(filter.key)}
                                    >
                                        {filter.labelKey ? t(filter.labelKey) : filter.label}
                                    </button>
                                ))}
                            </div>

                            <label className="matches-search">
                                <i className="fas fa-search"></i>
                                <input
                                    type="search"
                                    value={searchInput}
                                    onChange={handleSearchChange}
                                    placeholder={t('matches.list.searchPlaceholder')}
                                />
                            </label>
                        </div>
                    </GlowEffect>
                    </section>

                    <section className="matches-summary" aria-label={t('matches.list.summaryAria')}>
                    <StatCard label={t('matches.list.summary.total')} value={matchesData.summary.totalMatches} accent="cyan" />
                    <StatCard label={t('matches.list.summary.wins')} value={matchesData.summary.wins} accent="green" />
                    <StatCard label={t('matches.list.summary.losses')} value={matchesData.summary.losses} accent="red" />
                    <StatCard label={t('matches.list.summary.winRate')} value={`${matchesData.summary.winRate}%`} accent="yellow" />
                    <StatCard label={t('matches.list.summary.avgLines')} value={matchesData.summary.avgLines} accent="cyan" />
                    </section>

                    <section className="matches-list-section">
                    <GlowEffect className="matches-list-shell">
                        <div className="glow-effect matches-list-content">
                            <div className="matches-list-header">
                                <div className="profile-section-title">
                                    <i className="fas fa-gamepad"></i>
                                    {t('matches.list.sectionTitle')}
                                </div>
                                <span className="matches-list-note">
                                    {isLoading
                                        ? t('matches.list.updating')
                                        : t('matches.list.pageOf', {
                                            page: matchesData.pagination.page,
                                            total: Math.max(matchesData.pagination.totalPages, 1),
                                        })}
                                </span>
                            </div>

                            {error ? (
                                <div className="matches-empty-state">
                                    <i className="fas fa-triangle-exclamation"></i>
                                    <strong>{t('matches.list.errorTitle')}</strong>
                                    <p>{error}</p>
                                </div>
                            ) : null}

                            {!error && isLoading ? (
                                <div className="matches-skeletons">
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <div key={index} className="matches-skeleton" />
                                    ))}
                                </div>
                            ) : null}

                            {!error && !isLoading && matchesData.matches.length === 0 ? (
                                <div className="matches-empty-state">
                                    <i className="fas fa-folder-open"></i>
                                    <strong>{t('matches.list.emptyTitle')}</strong>
                                    <p>{t('matches.list.emptyText')}</p>
                                </div>
                            ) : null}

                            {!error && !isLoading && matchesData.matches.length > 0 ? (
                                <div className="matches-list">
                                    {matchesData.matches.map((match) => (
                                        <Link key={match.id} to={getLocalizedPath(`/matches/${match.id}`, currentLanguage)} className={`matches-item matches-item--${getMatchResultClass(match.result)}`}>
                                            <div className="matches-item-primary">
                                                <span className="matches-mode">
                                                    <i className={getMatchModeIcon(match.mode)}></i>
                                                    {getMatchModeLabel(match.mode, t)}
                                                </span>
                                                <strong className={`matches-result matches-result--${getMatchResultClass(match.result)}`}>
                                                    {formatMatchResultLabel(match.result, t)}
                                                </strong>
                                            </div>

                                            <div className="matches-item-center">
                                                <span className="matches-opponent">
                                                    {match.opponent}
                                                </span>
                                                <strong className="matches-score">
                                                    {match.score} : {match.opponentTeamScore}
                                                </strong>
                                                <div className="matches-metrics">
                                                    <span><i className="fas fa-layer-group"></i>{t('matches.list.lines', { count: match.linesCleared })}</span>
                                                    <span><i className="fas fa-signal"></i>{t('matches.list.level', { level: match.levelReached })}</span>
                                                    <span><i className="fas fa-hashtag"></i>{t('matches.list.matchNumber', { id: match.id })}</span>
                                                </div>
                                            </div>

                                            <div className="matches-item-meta">
                                                <span>{formatMatchDate(match.playedAt, currentLanguage, t)}</span>
                                                <span className="matches-item-link">{t('matches.list.openDetails')}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : null}

                            {!error && !isLoading && pageNumbers.length > 0 ? (
                                <div className="matches-pagination">
                                    {pageNumbers.map((pageNumber) => (
                                        <button
                                            key={pageNumber}
                                            type="button"
                                            className={`matches-page-button ${pageNumber === matchesData.pagination.page ? 'matches-page-button--active' : ''}`}
                                            onClick={() => setPage(pageNumber)}
                                        >
                                            {pageNumber}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </GlowEffect>
                    </section>
                </div>
            </div>
        </section>
    )
}

const StatCard = ({ label, value, accent }) => (
    <GlowEffect className="matches-summary-card">
        <div className={`glow-effect matches-summary-card__inner matches-summary-card__inner--${accent}`}>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    </GlowEffect>
)

export default MatchesPage
