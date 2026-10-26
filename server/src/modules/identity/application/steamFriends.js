export function createSteamFriendsService({ findConnections, findUsers, fetcher = fetch, env = process.env, now = Date.now }) {
    const cache = new Map(), pending = new Map()
    const enabled = () => Boolean(env.STEAM_APP_ID && env.STEAM_API_KEY)
    const listIds = async steamId => {
        const cached = cache.get(steamId)
        if (cached && cached.until > now()) return cached.ids
        if (pending.has(steamId)) return pending.get(steamId)
        const load = (async () => {
            let ids = []
            try {
                const url = new URL('https://api.steampowered.com/ISteamUser/GetFriendList/v1/')
                url.searchParams.set('key', env.STEAM_API_KEY); url.searchParams.set('steamid', steamId); url.searchParams.set('relationship', 'friend')
                const response = await fetcher(url, { signal: AbortSignal.timeout(5000), redirect: 'error' })
                if (response.ok) ids = ((await response.json())?.friendslist?.friends || []).map(friend => friend.steamid).filter(id => /^[0-9]{17}$/.test(id))
            } catch { /* Private lists and network errors never grant friendship. */ }
            if (cache.size >= 1000) cache.delete(cache.keys().next().value)
            cache.set(steamId, { ids, until: now()+60000 }); return ids
        })()
        pending.set(steamId, load)
        try { return await load } finally { pending.delete(steamId) }
    }
    return {
        async list(userId) {
            if (!enabled()) return { steamId: null, friends: [] }
            const [account] = await findConnections([userId])
            if (!account) return { steamId: null, friends: [] }
            const ids = await listIds(account.steamId)
            return { steamId: account.steamId, friends: ids.length ? await findUsers(ids) : [] }
        },
        async areFriends(viewerId, targetUserId) {
            if (!enabled() || !viewerId || !targetUserId || viewerId === targetUserId) return false
            const accounts = await findConnections([viewerId,targetUserId])
            const viewer = accounts.find(item => Number(item.userId) === Number(viewerId))
            const target = accounts.find(item => Number(item.userId) === Number(targetUserId))
            return Boolean(viewer && target && (await listIds(target.steamId)).includes(viewer.steamId))
        },
    }
}
