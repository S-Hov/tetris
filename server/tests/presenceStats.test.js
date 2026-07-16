import assert from 'node:assert/strict'
import test from 'node:test'

import {
    getActiveUsersCount,
    resetActiveSockets,
    trackActiveSocket,
    untrackActiveSocket,
} from '../sockets/presenceStats.js'

test('presence statistics count unique users instead of browser tabs', (t) => {
    t.after(resetActiveSockets)
    resetActiveSockets()

    trackActiveSocket({ id: 'socket-1', data: { user: { id: 42 } } })
    trackActiveSocket({ id: 'socket-2', data: { user: { id: 42 } } })
    trackActiveSocket({ id: 'socket-3', data: { browserId: 'guest-browser' } })

    assert.equal(getActiveUsersCount(), 2)

    untrackActiveSocket('socket-1')
    assert.equal(getActiveUsersCount(), 2)

    untrackActiveSocket('socket-2')
    assert.equal(getActiveUsersCount(), 1)
})

test('presence statistics fall back to guest and socket identities', (t) => {
    t.after(resetActiveSockets)
    resetActiveSockets()

    trackActiveSocket({
        id: 'socket-guest',
        data: {},
        handshake: { auth: { guestId: 'guest-id' } },
    })
    trackActiveSocket({ id: 'socket-fallback', data: {}, handshake: { auth: {} } })

    assert.equal(getActiveUsersCount(), 2)
})
