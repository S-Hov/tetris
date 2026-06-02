import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { leaderboardAPI } from '@/shared/api/leaderboard'
import { useAuth } from '@/shared/hooks/useAuth'

import ArenaLeadersPanel from './components/ArenaLeadersPanel/ArenaLeadersPanel.jsx'
import PlayerStatsPanel from './components/PlayerStatsPanel/PlayerStatsPanel.jsx'
import { getRankImage } from './arenaDashboard.utils.js'

import './ArenaDashboardSection.css'

const ArenaDashboardSection = ({ currentLanguage }) => {
    const { t } = useTranslation()
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const [topPlayers, setTopPlayers] = useState([])
    const [isTopLoading, setIsTopLoading] = useState(true)

    useEffect(() => {
        let ignore = false

        const loadTopPlayers = async () => {
            setIsTopLoading(true)

            try {
                const data = await leaderboardAPI.getList({ sort: 'rating', limit: 5 })

                if (!ignore) {
                    setTopPlayers(Array.isArray(data.players) ? data.players : [])
                }
            } catch {
                if (!ignore) {
                    setTopPlayers([])
                }
            } finally {
                if (!ignore) {
                    setIsTopLoading(false)
                }
            }
        }

        loadTopPlayers()

        return () => {
            ignore = true
        }
    }, [])

    const playerStats = useMemo(() => {
        const rankStats = user?.rankStats
        const rank = rankStats?.rank
        const totalMatches = Number(rankStats?.totalMatches) || 0
        const wins = Number(rankStats?.wins) || 0
        const rankPoints = Number(rankStats?.rankPoints) || 0
        const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
        const rankMin = Number(rank?.min) || 0
        const rankMax = rank?.max === null || rank?.max === undefined ? null : Number(rank.max)
        const hasNextRank = rankMax !== null
        const progress = hasNextRank
            ? Math.max(0, Math.min(100, Math.round(((rankPoints - rankMin) / (rankMax + 1 - rankMin)) * 100)))
            : 100

        return {
            totalMatches,
            wins,
            winRate,
            rankPoints,
            rank,
            rankImage: getRankImage(rank),
            hasNextRank,
            progress,
            nextRankPoints: hasNextRank ? rankMax + 1 : null,
        }
    }, [user])

    return (
        <section className="arena-dashboard-section" aria-label={t('home.dashboard.ariaLabel')}>
            <ArenaLeadersPanel
                currentLanguage={currentLanguage}
                isLoading={isTopLoading}
                players={topPlayers}
            />
            <PlayerStatsPanel
                currentLanguage={currentLanguage}
                isAuth={isAuth}
                isLoading={isAuthLoading}
                playerStats={playerStats}
            />
        </section>
    )
}

export default ArenaDashboardSection
