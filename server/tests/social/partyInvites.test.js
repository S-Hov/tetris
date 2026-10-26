import test from 'node:test'
import assert from 'node:assert/strict'
import { registerPartyInvites } from '../../sockets/partyInvites.js'
function fixture({ authorize = async () => true } = {}) {
    let time = 1000
    const events = [], handlers = new Map()
    const party = { id: 'party', ownerUserId: 1, status: 'idle', players: [{ id: 1 }] }
    const parties = new Map([['party', party]])
    const io = { sockets: { adapter: { rooms: new Map([['user:2', true]]) } }, to: room => ({ emit: (event, payload) => events.push({ room, event, payload }) }) }
    const bind = id => {
        const local = new Map()
        registerPartyInvites(io, { data: { user: { id, username: `User ${id}` } }, on: (event, handler) => local.set(event, handler) }, parties, { authorize, now: () => time })
        handlers.set(id, local)
    }
    bind(1); bind(2); bind(3)
    const call = async (id, event, payload) => { let result; await handlers.get(id).get(event)(payload, response => { result = response }); return result }
    return { call, party, events, expire: () => { time += 60001 } }
}
const send = 'friends:party-invite:send', respond = 'friends:party-invite:respond'
test('party invitation targets receiver, respects ownership and cannot be accepted by another user', async () => {
    const f = fixture()
    assert.equal((await f.call(2, send, { friendId: 1, partyId: 'party' })).success, false)
    const response = await f.call(1, send, { friendId: 2, partyId: 'party' })
    assert.equal(response.success, true)
    assert.equal(f.events[0].room, 'user:2')
    assert.equal((await f.call(3, respond, { inviteId: response.invite.id, accepted: true })).success, false)
    assert.equal((await f.call(2, respond, { inviteId: response.invite.id, accepted: true })).success, true)
    assert.equal((await f.call(2, respond, { inviteId: response.invite.id, accepted: true })).success, false)
    assert.equal(f.party.players.length, 1, 'accepting never bypasses party:join')
})
test('privacy, expired invites and full parties reject without joining', async () => {
    const denied = fixture({ authorize: async () => false })
    assert.equal((await denied.call(1, send, { friendId: 2, partyId: 'party' })).success, false)
    const f = fixture()
    const { invite } = await f.call(1, send, { friendId: 2, partyId: 'party' })
    f.expire()
    assert.equal((await f.call(2, respond, { inviteId: invite.id, accepted: true })).success, false)
    const second = await f.call(1, send, { friendId: 2, partyId: 'party' })
    f.party.players.push({ id: 3 })
    assert.equal((await f.call(2, respond, { inviteId: second.invite.id, accepted: true })).success, false)
})
