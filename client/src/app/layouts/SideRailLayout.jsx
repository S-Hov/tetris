import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import useMediaQuery from '@/shared/hooks/useMediaQuery'
import './SideRailLayout.css'

const ActivityFeed = lazy(() => import('@/widgets/ActivityFeed'))
const FriendsRail = lazy(() => import('@/widgets/FriendsRail'))

const SideRailLayout = ({ children }) => {
    const { t } = useTranslation()
    const isCompactMobile = useMediaQuery('(max-width: 599px)')
    const [isFriendsOpen, setIsFriendsOpen] = useState(false)
    const shouldShowFriendsModal = isCompactMobile && isFriendsOpen

    useEffect(() => {
        if (!shouldShowFriendsModal) {
            return undefined
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsFriendsOpen(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [shouldShowFriendsModal])

    return (
        <div className={`side-rail-layout ${isCompactMobile ? 'side-rail-layout--mobile' : ''}`}>
            {!isCompactMobile ? (
                <div className="side-rail-layout__rail side-rail-layout__rail--left">
                    <Suspense fallback={null}>
                        <ActivityFeed />
                    </Suspense>
                </div>
            ) : null}

            <div className="side-rail-layout__content">
                {children}
            </div>

            {isCompactMobile ? (
                <>
                    <button
                        className="side-rail-layout__friends-button"
                        type="button"
                        aria-label={t('friendsRail.ariaLabel')}
                        aria-haspopup="dialog"
                        aria-expanded={shouldShowFriendsModal}
                        onClick={() => setIsFriendsOpen(true)}
                    >
                        <i className="fas fa-user-group"></i>
                    </button>

                    {shouldShowFriendsModal ? (
                        <div
                            className="side-rail-layout__friends-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label={t('friendsRail.ariaLabel')}
                        >
                            <button
                                className="side-rail-layout__friends-backdrop"
                                type="button"
                                aria-label="Close friends panel"
                                onClick={() => setIsFriendsOpen(false)}
                            />
                            <div className="side-rail-layout__friends-sheet">
                                {/* <button
                                    className="side-rail-layout__friends-close"
                                    type="button"
                                    aria-label="Close friends panel"
                                    onClick={() => setIsFriendsOpen(false)}
                                >
                                    <i className="fas fa-xmark"></i>
                                </button> */}
                                <Suspense fallback={<div className="side-rail-layout__friends-loading" />}>
                                    <FriendsRail />
                                </Suspense>
                            </div>
                        </div>
                    ) : null}
                </>
            ) : (
                <div className="side-rail-layout__rail side-rail-layout__rail--right">
                    <Suspense fallback={null}>
                        <FriendsRail />
                    </Suspense>
                </div>
            )}
        </div>
    )
}

export default SideRailLayout
