import { Link } from 'react-router-dom'

import { formatDateTime, getProfileMatchData } from '../../profile.utils.js'
import ProfilePanel from '../ProfilePanel/ProfilePanel.jsx'
import './ProfileMatchesPanel.css'

const ProfileMatchesPanel = ({ currentLanguage, matchHistory, t }) => (
    <ProfilePanel
        className="profile-panel--matches"
        title={t('profile.matches.title')}
        action={<Link to="/matches">{t('profile.matches.viewAll')}</Link>}
    >
        <div className="profile-match-list">
            {matchHistory.length > 0 ? (
                matchHistory.map((match) => (
                    <MatchRow key={match.id} match={match} lang={currentLanguage} t={t} />
                ))
            ) : (
                <div className="profile-empty">
                    <i className="fas fa-folder-open"></i>
                    <strong>{t('profile.matches.emptyTitle')}</strong>
                    <span>{t('profile.matches.emptyText')}</span>
                </div>
            )}
        </div>
    </ProfilePanel>
)

const MatchRow = ({ match, lang, t }) => {
    const matchData = getProfileMatchData(match, t)

    return (
        <Link to={`/matches/${match.id}`} className={`profile-match-row profile-match-row--${matchData.resultClass}`}>
            <div>
                <strong>{matchData.resultLabel}</strong>
                <span>vs {matchData.opponent}</span>
            </div>
            <span>{matchData.modeLabel}</span>
            <div>
                <strong>{matchData.score}</strong>
                <span>{formatDateTime(match.playedAt, lang, t)}</span>
            </div>
        </Link>
    )
}

export default ProfileMatchesPanel
