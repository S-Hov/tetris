import { Link } from 'react-router-dom'

import { getLocalizedPath } from '@/i18n'
import GlowEffect from '@/shared/ui/GlowEffect'

import { formatNumber } from '../../profile.utils.js'
import './ProfileHero.css'

const ProfileHero = ({ currentLanguage, profile, t }) => (
    <GlowEffect className="profile-hero-glow">
        <section
            className={`profile-hero profile-hero--${profile.rankKey}`}
            style={{ '--profile-rank-bg': `url(${profile.rankAssets.bg})` }}
        >
            <div className="profile-hero__rank">
                <img src={profile.rankAssets.icon} alt={profile.rankName} />
            </div>

            <div className="profile-hero__player">
                <span className="profile-rank-pill">{profile.rankName}</span>
                <div className="profile-hero__name-row">
                    <h1>{profile.name}</h1>
                    <Link className="profile-edit-link" to={getLocalizedPath('/account-settings/account', currentLanguage)} aria-label={t('profile.hero.editAria')}>
                        <i className="fas fa-pen"></i>
                    </Link>
                </div>
                <div className="profile-hero__rating">
                    <i className="fas fa-trophy"></i>
                    <strong>{formatNumber(profile.rankPoints, currentLanguage)}</strong>
                    <span>MMR</span>
                </div>
                <div className="profile-hero__meta">
                    <span><i className="fas fa-calendar"></i>{t('profile.hero.memberSince', { date: profile.memberSince.full })}</span>
                    <span><i className="fas fa-id-card"></i>ID: {profile.id || '-'}</span>
                </div>
            </div>

            <div className="profile-season-card" style={{ '--profile-rank-frame': `url(${profile.rankAssets.frame})` }}>
                <span>{t('profile.hero.season')}</span>
                <strong>{profile.rankName}</strong>
            </div>

            <div className="profile-hero-stats" aria-label={t('profile.hero.statsAria')}>
                <HeroStat icon="fas fa-chart-line" label={t('profile.hero.winRate')} value={`${profile.winRate}%`} />
                <HeroStat icon="fas fa-trophy" label={t('profile.hero.wins')} value={formatNumber(profile.wins, currentLanguage)} />
                <HeroStat icon="fas fa-gamepad" label={t('profile.hero.matches')} value={formatNumber(profile.totalMatches, currentLanguage)} />
                <HeroStat icon="fas fa-fire" label={t('profile.hero.solo')} value={formatNumber(profile.bestSoloScore, currentLanguage)} />
            </div>
        </section>
    </GlowEffect>
)

const HeroStat = ({ icon, label, value }) => (
    <article className="profile-hero-stat">
        <i className={icon}></i>
        <div>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    </article>
)

export default ProfileHero
