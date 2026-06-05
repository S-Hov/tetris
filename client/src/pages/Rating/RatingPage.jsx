import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'
import { leaderboardAPI } from '@/shared/api/leaderboard'
import { useAuth } from '@/shared/hooks/useAuth'
import PlayerStatsPanel, { buildPlayerStats } from '@/widgets/PlayerStatsPanel'

import RatingBoard from './components/RatingBoard/RatingBoard.jsx'
import RatingControls from './components/RatingControls/RatingControls.jsx'
import RatingHero from './components/RatingHero/RatingHero.jsx'
import RatingPodium from './components/RatingPodium/RatingPodium.jsx'
import RatingSidebar from './components/RatingSidebar/RatingSidebar.jsx'
import { SITE_URL } from './ratingPage.config.js'

import './RatingPage.css'

const RatingPage = () => {
    const { lang } = useParams()
    const { t, i18n } = useTranslation()
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const [sort, setSort] = useState('rating')
    const [players, setPlayers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    useEffect(() => {
        let ignore = false

        const loadLeaderboard = async () => {
            setIsLoading(true)
            setError('')

            try {
                const data = await leaderboardAPI.getList({ sort, limit: 50 })

                if (!ignore) {
                    setPlayers(Array.isArray(data.players) ? data.players : [])
                }
            } catch (requestError) {
                if (!ignore) {
                    setPlayers([])
                    setError(requestError?.message || t('rating.board.loadError'))
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        loadLeaderboard()

        return () => {
            ignore = true
        }
    }, [sort, t])

    const topPlayers = useMemo(() => players.slice(0, 3), [players])
    const podiumPlayers = useMemo(() => {
        const byRank = new Map(topPlayers.map((player) => [player.rank, player]))

        return [byRank.get(2), byRank.get(1), byRank.get(3)].filter(Boolean)
    }, [topPlayers])
    const leader = topPlayers[0]
    const totalGames = useMemo(
        () => players.reduce((sum, player) => sum + Number(player.totalGames || 0), 0),
        [players]
    )
    const playerStats = useMemo(() => buildPlayerStats(user), [user])

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/rating`} replace />
    }

    return (
        <section className="section rating-page">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('rating.seo.title')}</title>
                <meta name="description" content={t('rating.seo.description')} />
                <link rel="canonical" href={`${SITE_URL}/${currentLanguage}/rating`} />
                <link rel="alternate" hrefLang="ru" href={`${SITE_URL}/ru/rating`} />
                <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en/rating`} />
                <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/ru/rating`} />
            </Helmet>

            <div className="container rating-container">
                <RatingHero
                    currentLanguage={currentLanguage}
                    playersCount={players.length}
                    totalGames={totalGames}
                />
                <PlayerStatsPanel
                    currentLanguage={currentLanguage}
                    isAuth={isAuth}
                    isLoading={isAuthLoading}
                    playerStats={playerStats}
                />
                <RatingControls sort={sort} onSortChange={setSort} />
                <RatingPodium currentLanguage={currentLanguage} players={podiumPlayers} />

                <div className="rating-content-grid">
                    <RatingBoard
                        currentLanguage={currentLanguage}
                        error={error}
                        isLoading={isLoading}
                        players={players}
                        sort={sort}
                    />
                    <RatingSidebar currentLanguage={currentLanguage} player={leader} />
                </div>
            </div>
        </section>
    )
}

export default RatingPage
