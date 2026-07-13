import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedPath } from '@/i18n'
import { usersAPI } from '@/shared/api/users'
import ProfileAccountPanel from '@/pages/Profile/components/PublicProfileAccountPanel/PublicProfileAccountPanel.jsx'
import ProfileHero from '@/pages/Profile/components/ProfileHero/ProfileHero.jsx'
import ProfileMatchesPanel from '@/pages/Profile/components/ProfileMatchesPanel/ProfileMatchesPanel.jsx'
import ProfileStatsPanel from '@/pages/Profile/components/ProfileStatsPanel/ProfileStatsPanel.jsx'
import { buildProfile, buildProfileStats } from '@/pages/Profile/profile.utils.js'

import './PublicProfilePage.css'

const PublicProfilePage = () => {
    const { lang, userId } = useParams()
    const { t } = useTranslation()
    const [state, setState] = useState({ userId: null, status: 'loading', user: null, error: null })

    useEffect(() => {
        const controller = new AbortController()

        usersAPI.getProfile(userId, { signal: controller.signal })
            .then((response) => {
                if (!controller.signal.aborted) {
                    setState({ userId, status: 'ready', user: response.profile, error: null })
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    setState({ userId, status: 'error', user: null, error })
                }
            })

        return () => controller.abort()
    }, [userId])

    const isCurrentRequest = state.userId === userId
    const status = isCurrentRequest ? state.status : 'loading'
    const error = isCurrentRequest ? state.error : null
    const profile = useMemo(
        () => isCurrentRequest && state.user ? buildProfile({ currentLanguage: lang, t, user: state.user }) : null,
        [isCurrentRequest, lang, state.user, t]
    )
    const stats = useMemo(
        () => profile ? buildProfileStats({ currentLanguage: lang, profile, t }) : [],
        [lang, profile, t]
    )

    if (status !== 'ready') {
        const isPrivate = error?.status === 403
        const isNotFound = error?.status === 404

        return (
            <section className="section profile-page public-profile-page">
                <div className="container public-profile-shell">
                    <div className="public-profile-state" role={status === 'error' ? 'alert' : 'status'}>
                        <i className={status === 'loading' ? 'fas fa-circle-notch fa-spin' : isPrivate ? 'fas fa-user-lock' : 'fas fa-user-slash'}></i>
                        <h1>{status === 'loading' ? t('profile.public.loading') : isPrivate ? t('profile.public.privateTitle') : isNotFound ? t('profile.public.notFoundTitle') : t('profile.public.errorTitle')}</h1>
                        <p>{status === 'loading' ? t('profile.public.loadingText') : isPrivate ? t('profile.public.privateText') : isNotFound ? t('profile.public.notFoundText') : t('profile.public.errorText')}</p>
                        {status === 'error' ? (
                            <Link className="button" to={getLocalizedPath('/rating', lang)}>{t('profile.public.backToRating')}</Link>
                        ) : null}
                    </div>
                </div>
            </section>
        )
    }

    const title = t('profile.public.seoTitle', { username: profile.name })

    return (
        <section className="section profile-page public-profile-page">
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={t('profile.public.seoDescription', { username: profile.name })} />
                <link rel="canonical" href={`${window.location.origin}/${lang}/profile/${profile.id}`} />
            </Helmet>

            <div className="container public-profile-shell">
                <div className="profile-content">
                    <ProfileHero currentLanguage={lang} profile={profile} showEdit={false} t={t} />

                    <div className="profile-main-grid">
                        <ProfileStatsPanel stats={stats} t={t} />
                        <ProfileMatchesPanel
                            currentLanguage={lang}
                            linkMatches={false}
                            matchHistory={profile.recentMatches.slice(0, 6)}
                            showViewAll={false}
                            t={t}
                        />
                    </div>

                    <ProfileAccountPanel profile={profile} t={t} />
                </div>
            </div>
        </section>
    )
}

export default PublicProfilePage
