import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLocalizedPath, SUPPORTED_LANGUAGES } from '@/i18n'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import ProfileSideNav from '@/widgets/ProfileSideNav'

import ProfileAccountPanel from './components/ProfileAccountPanel/ProfileAccountPanel.jsx'
import ProfileHero from './components/ProfileHero/ProfileHero.jsx'
import ProfileMatchesPanel from './components/ProfileMatchesPanel/ProfileMatchesPanel.jsx'
import ProfileQuickSettingsPanel from './components/ProfileQuickSettingsPanel/ProfileQuickSettingsPanel.jsx'
import ProfileStatsPanel from './components/ProfileStatsPanel/ProfileStatsPanel.jsx'
import ProfileSupportPanel from './components/ProfileSupportPanel/ProfileSupportPanel.jsx'
import { SITE_URL } from './profilePage.config.js'
import { buildProfile, buildProfileStats } from './profile.utils.js'

import './ProfilePage.css'

const ProfilePage = () => {
    const { lang } = useParams()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const { checkAuth, logout, user } = useAuth()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    useEffect(() => {
        checkAuth({ silent: true })
    }, [checkAuth])

    const profile = useMemo(
        () => buildProfile({ currentLanguage, t, user }),
        [currentLanguage, t, user]
    )
    const stats = useMemo(
        () => buildProfileStats({ currentLanguage, profile, t }),
        [currentLanguage, profile, t]
    )
    const matchHistory = useMemo(() => profile.recentMatches.slice(0, 6), [profile.recentMatches])

    const handleLogout = async () => {
        await logout()
        navigate(getLocalizedPath('/login', currentLanguage), { replace: true })
    }

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/profile`} replace />
    }

    return (
        <section className="section profile-page">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('profile.seo.title')}</title>
                <meta name="description" content={t('profile.seo.description')} />
                <meta property="og:title" content={t('profile.seo.ogTitle')} />
                <meta property="og:description" content={t('profile.seo.ogDescription')} />
                <meta property="og:type" content="website" />
                <link rel="canonical" href={`${SITE_URL}/${currentLanguage}/profile`} />
                <link rel="alternate" hrefLang="ru" href={`${SITE_URL}/ru/profile`} />
                <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en/profile`} />
                <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/ru/profile`} />
            </Helmet>

            <div className="container profile-shell profile-layout-shell">
                <ProfileSideNav />

                <div className="profile-content profile-layout-content">
                    <ProfileHero currentLanguage={currentLanguage} profile={profile} t={t} />

                    <div className="profile-main-grid">
                        <ProfileStatsPanel stats={stats} t={t} />
                        <ProfileMatchesPanel
                            currentLanguage={currentLanguage}
                            matchHistory={matchHistory}
                            t={t}
                        />
                    </div>

                    <ProfileAccountPanel onLogout={handleLogout} profile={profile} t={t} />
                    <ProfileQuickSettingsPanel
                        isDarkTheme={isDarkTheme}
                        isGlowEffectEnabled={isGlowEffectEnabled}
                        onGlowEffectToggle={toggleGlowEffect}
                        onThemeToggle={toggleTheme}
                        t={t}
                    />
                    <ProfileSupportPanel currentLanguage={currentLanguage} t={t} />
                </div>
            </div>
        </section>
    )
}

export default ProfilePage
