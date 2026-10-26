import crypto from 'node:crypto'

// Invitations only convey a destination; party:join still validates membership and capacity.
export function registerPartyInvites(io, socket, parties, { authorize = async () => false, now = Date.now, ttl = 60000 } = {}) {
    const userId = socket.data.user?.id
    if (!Number.isInteger(userId) || socket.data.user?.role === 'guest') return
    socket.on('friends:party-invite:send', async ({ friendId, partyId } = {}, callback) => {
        try {
            const target = Number(friendId)
            const party = parties.get(partyId)
            if (!Number.isInteger(target) || target <= 0 || target === userId || !party || party.ownerUserId !== userId || party.status !== 'idle' || party.players.length >= 2) {
                callback?.({ success: false, message: 'Party is not available for invitations' }); return
            }
            if (!io.sockets.adapter.rooms.has(`user:${target}`)) { callback?.({ success: false, message: 'User is offline' }); return }
            for (const [id, item] of party.invites || []) if (item.expiresAt <= now()) party.invites.delete(id)
            if ((party.invites?.size || 0) >= 100) { callback?.({ success: false, message: 'Too many pending invitations' }); return }
            const previous = party.invites?.get(target)
            if (previous && previous.expiresAt > now()) { callback?.({ success: true, invite: previous }); return }
            if (!await authorize({ inviterId: userId, inviteeId: target })) { callback?.({ success: false, message: 'This user does not accept invitations' }); return }
            // Recheck after asynchronous permission lookup.
            if (parties.get(partyId) !== party || party.status !== 'idle' || party.players.length >= 2) { callback?.({ success: false, message: 'Party is no longer available' }); return }
            const invite = { id: crypto.randomUUID(), partyId, modeKey: '2v2', inviter: { id: userId, username: socket.data.user.username || socket.data.user.nickname }, createdAt: new Date(now()).toISOString(), expiresAt: now() + ttl }
            party.invites ||= new Map()
            party.invites.set(target, invite)
            io.to(`user:${target}`).emit('friends:party-invite', invite)
            callback?.({ success: true, invite })
        } catch { callback?.({ success: false, message: 'Could not send invitation' }) }
    })
    socket.on('friends:party-invite:respond', ({ inviteId, accepted } = {}, callback) => {
        if (typeof accepted !== 'boolean') { callback?.({ success: false }); return }
        const party = [...parties.values()].find(item => item.invites?.get(userId)?.id === inviteId)
        const invite = party?.invites?.get(userId)
        if (!invite || invite.expiresAt <= now() || (accepted && (party.status !== 'idle' || party.players.length >= 2))) { callback?.({ success: false, message: 'Invitation expired or party unavailable' }); return }
        party.invites.delete(userId)
        io.to(`user:${invite.inviter.id}`).emit('friends:party-invite:response', { inviteId, accepted: Boolean(accepted), user: { id: userId, username: socket.data.user.username } })
        callback?.({ success: true, partyId: party.id })
    })
}
