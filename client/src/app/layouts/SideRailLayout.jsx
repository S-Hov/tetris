import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import useMediaQuery from '@/shared/hooks/useMediaQuery'
import AudioControl from '@/widgets/AudioControl'
import ChatWidget from '@/widgets/ChatWidget'
import MobileQuickDock from '@/widgets/MobileQuickDock'
import './SideRailLayout.css'

const ActivityFeed = lazy(() => import('@/widgets/ActivityFeed'))
const FriendsRail = lazy(() => import('@/widgets/FriendsRail'))

const SideRailLayout = ({ children }) => {
    const { t } = useTranslation()
    const isCompactMobile = useMediaQuery('(max-width: 599px)')
    const [isFriendsOpen, setIsFriendsOpen] = useState(false)
    const [audioOpenSignal, setAudioOpenSignal] = useState(0)
    const [chatOpenSignal, setChatOpenSignal] = useState(0)
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
                    <MobileQuickDock
                        onAudio={() => setAudioOpenSignal((currentValue) => currentValue + 1)}
                        onChat={() => setChatOpenSignal((currentValue) => currentValue + 1)}
                        onFriends={() => setIsFriendsOpen(true)}
                    />

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

            <AudioControl
                hideTrigger={isCompactMobile}
                openSignal={audioOpenSignal}
            />
            <ChatWidget
                hideTrigger={isCompactMobile}
                openSignal={chatOpenSignal}
            />
        </div>
    )
}

export default SideRailLayout
