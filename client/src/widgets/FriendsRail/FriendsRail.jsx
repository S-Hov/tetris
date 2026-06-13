import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/shared/hooks/useAuth.js'

import './FriendsRail.css'

const previewFriends = [
    { id: 'queue', name: 'Match queue', status: 'soon', tone: 'cyan' },
    { id: 'duo', name: 'Duo invite', status: 'soon', tone: 'pink' },
    { id: 'party', name: 'Party slot', status: 'soon', tone: 'violet' },
]

const FriendsRail = () => {
    const { t } = useTranslation()
    const { isAuth, isLoading } = useAuth()

    return (
        <aside className="friends-rail" aria-label={t('friendsRail.ariaLabel')} tabIndex={0}>
            <header className="friends-rail__header">
                <span className="friends-rail__icon" aria-hidden="true">
                    <i className="fas fa-user-group"></i>
                </span>
                <span className="friends-rail__title">
                    <small>{t('friendsRail.eyebrow')}</small>
                    <strong>{t('friendsRail.title')}</strong>
                </span>
                <span className="friends-rail__badge">{isAuth ? '0' : '!'}</span>
            </header>

            <div className="friends-rail__content">
                {isLoading ? (
                    <div className="friends-rail__empty">
                        <span className="friends-rail__loader"></span>
                        <p>{t('friendsRail.loading')}</p>
                    </div>
                ) : isAuth ? (
                    <>
                        <div className="friends-rail__summary">
                            <span>
                                <strong>0</strong>
                                {t('friendsRail.online')}
                            </span>
                            <span>
                                <strong>0</strong>
                                {t('friendsRail.requests')}
                            </span>
                        </div>

                        <div className="friends-rail__list" aria-label={t('friendsRail.listLabel')}>
                            {previewFriends.map((friend) => (
                                <div className={`friends-rail__item friends-rail__item--${friend.tone}`} key={friend.id}>
                                    <span className="friends-rail__avatar" aria-hidden="true">
                                        <i className="fas fa-user"></i>
                                    </span>
                                    <span className="friends-rail__item-body">
                                        <strong>{t(`friendsRail.preview.${friend.id}`)}</strong>
                                        <small>{t(`friendsRail.status.${friend.status}`)}</small>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="friends-rail__guest">
                        <span className="friends-rail__guest-icon" aria-hidden="true">
                            <i className="fas fa-lock"></i>
                        </span>
                        <strong>{t('friendsRail.guestTitle')}</strong>
                        <p>{t('friendsRail.guestText')}</p>
                        <Link className="friends-rail__register" to="/register">
                            <i className="fas fa-user-plus"></i>
                            {t('friendsRail.register')}
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    )
}

export default FriendsRail
