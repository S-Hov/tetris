import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedGamePath } from '@/i18n'
import { socket } from '@/shared/api/socket'
import { useAuth } from '@/shared/hooks/useAuth.js'
import notify from '@/utils/Notifications'

import './RoomInviteModal.css'

const emitWithAck = (eventName, payload) => new Promise((resolve) => {
    socket.emit(eventName, payload, (response) => resolve(response || { success: false }))
})

const RoomInviteModal = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { isAuth } = useAuth()
    const [invite, setInvite] = useState(null)

    useEffect(() => {
        if (!isAuth) {
            return undefined
        }

        const handleRoomInvite = (payload) => {
            setInvite(payload)
            notify(t('roomInvite.toast', { username: payload?.inviter?.username || t('roomInvite.friend') }), 'info')
        }

        const handleInviteResponse = ({ accepted, user }) => {
            const username = user?.username || t('roomInvite.friend')

            notify(
                accepted
                    ? t('roomInvite.responseAccepted', { username })
                    : t('roomInvite.responseDeclined', { username }),
                accepted ? 'success' : 'info'
            )
        }

        socket.on('friends:room-invite', handleRoomInvite)
        socket.on('friends:room-invite:response', handleInviteResponse)

        return () => {
            socket.off('friends:room-invite', handleRoomInvite)
            socket.off('friends:room-invite:response', handleInviteResponse)
        }
    }, [isAuth, t])

    if (!isAuth || !invite) {
        return null
    }

    const language = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
    const roomPath = getLocalizedGamePath(`/game/${invite.modeKey || '1v1'}/lobby/${invite.roomId}`, language)

    const respond = async (accepted) => {
        await emitWithAck('friends:room-invite:respond', {
            inviteId: invite.id,
            accepted,
        })

        const acceptedInvite = invite
        setInvite(null)

        if (accepted) {
            navigate(roomPath, {
                state: {
                    modeKey: acceptedInvite.modeKey || '1v1',
                    roomId: acceptedInvite.roomId,
                },
            })
        }
    }

    return (
        <div className="room-invite-modal" role="presentation">
            <div className="room-invite-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="room-invite-title">
                <button
                    className="room-invite-modal__close"
                    type="button"
                    aria-label={t('roomInvite.close')}
                    onClick={() => respond(false)}
                >
                    <i className="fas fa-xmark"></i>
                </button>

                <span className="room-invite-modal__icon" aria-hidden="true">
                    <i className="fas fa-user-group"></i>
                </span>
                <p className="room-invite-modal__eyebrow">{t('roomInvite.eyebrow')}</p>
                <h2 id="room-invite-title">{t('roomInvite.title')}</h2>
                <p>
                    {t('roomInvite.description', {
                        username: invite.inviter?.username || t('roomInvite.friend'),
                        mode: invite.modeKey || '1v1',
                    })}
                </p>

                <div className="room-invite-modal__actions">
                    <button className="room-invite-modal__decline" type="button" onClick={() => respond(false)}>
                        {t('roomInvite.decline')}
                    </button>
                    <button className="room-invite-modal__accept" type="button" onClick={() => respond(true)}>
                        {t('roomInvite.accept')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RoomInviteModal
