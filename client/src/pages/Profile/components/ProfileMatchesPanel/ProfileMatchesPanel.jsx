import { Link } from 'react-router-dom'

import { getLocalizedPath } from '@/i18n'
import { formatDateTime, getProfileMatchData } from '../../profile.utils.js'
import ProfilePanel from '../ProfilePanel/ProfilePanel.jsx'
import './ProfileMatchesPanel.css'

const ProfileMatchesPanel = ({ currentLanguage, linkMatches = true, matchHistory, showViewAll = true, t }) => (
    <ProfilePanel
        className="profile-panel--matches"
        title={t('profile.matches.title')}
        action={showViewAll ? <Link to={getLocalizedPath('/matches', currentLanguage)}>{t('profile.matches.viewAll')}</Link> : null}
    >
        <div className="profile-match-list">
            {matchHistory.length > 0 ? (
                matchHistory.map((match) => (
                    <MatchRow key={match.id} linkMatches={linkMatches} match={match} lang={currentLanguage} t={t} />
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

const MatchRow = ({ linkMatches, match, lang, t }) => {
    const matchData = getProfileMatchData(match, t)
    const content = (
        <>
            <div>
                <strong>{matchData.resultLabel}</strong>
                <span>vs {matchData.opponent}</span>
            </div>
            <span>{matchData.modeLabel}</span>
            <div>
                <strong>{matchData.score}</strong>
                <span>{formatDateTime(match.playedAt, lang, t)}</span>
            </div>
        </>
    )
    const className = `profile-match-row profile-match-row--${matchData.resultClass}`

    return linkMatches ? (
        <Link to={getLocalizedPath(`/matches/${match.id}`, lang)} className={className}>{content}</Link>
    ) : (
        <article className={className}>{content}</article>
    )
}

export default ProfileMatchesPanel
