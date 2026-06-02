import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { formatNumber, getAssetUrl } from '../../arenaDashboard.utils.js'

import './ArenaLeadersPanel.css'

const ArenaLeadersPanel = ({ currentLanguage, isLoading, players }) => {
    const { t } = useTranslation()

    return (
        <GlowEffect>
            <section className="arena-leaders-panel">
                <div className="arena-panel-heading">
                    <h2>{t('home.dashboard.leadersTitle')}</h2>
                    <span>{t('home.dashboard.season')}</span>
                </div>

                {isLoading ? (
                    <div className="arena-panel-state">
                        <i className="fas fa-sync-alt"></i>
                        {t('home.dashboard.loadingRating')}
                    </div>
                ) : players.length === 0 ? (
                    <div className="arena-panel-state">
                        <i className="fas fa-database"></i>
                        {t('home.dashboard.emptyRating')}
                    </div>
                ) : (
                    <div className="arena-leaders-list">
                        {players.map((player) => (
                            <Link to="/rating" className="arena-leader-row" key={player.id}>
                                <span className="arena-leader-row__place">{player.rank}</span>
                                <span className="arena-leader-row__avatar">
                                    <PlayerAvatar player={player} />
                                </span>
                                <span className="arena-leader-row__name">
                                    {player.username}
                                    {player.rank === 1 ? <i className="fas fa-crown"></i> : null}
                                </span>
                                <strong>{formatNumber(player.rating, currentLanguage)}</strong>
                            </Link>
                        ))}
                    </div>
                )}

                <Link to="/rating" className="button arena-panel-button btn-hover-shine">
                    {t('home.dashboard.fullRatingButton')}
                </Link>
            </section>
        </GlowEffect>
    )
}

const PlayerAvatar = ({ player }) => {
    const avatarUrl = getAssetUrl(player.avatarUrl)

    if (!avatarUrl) {
        return player.avatar
    }

    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(avatarUrl)) {
        return <video src={avatarUrl} autoPlay loop muted playsInline aria-label={player.username || 'avatar'} />
    }

    return <img src={avatarUrl} alt={player.username || 'avatar'} />
}

export default ArenaLeadersPanel
