import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { leaderboardAPI } from '@/shared/api/leaderboard'
import { useAuth } from '@/shared/hooks/useAuth'
import PlayerStatsPanel, { buildPlayerStats } from '@/widgets/PlayerStatsPanel'

import ArenaLeadersPanel from './components/ArenaLeadersPanel/ArenaLeadersPanel.jsx'

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

    const playerStats = useMemo(() => buildPlayerStats(user), [user])

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
