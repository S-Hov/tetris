// This module has no database access. Publisher credentials never leave the backend.
export async function verifySteamTicket(ticket, { env = process.env, fetcher = fetch } = {}) {
    if (!/^[1-9][0-9]*$/.test(env.STEAM_APP_ID || '') || !env.STEAM_API_KEY) throw new Error('Steam desktop authentication is not configured')
    if (typeof ticket !== 'string' || ticket.length < 32 || ticket.length > 8192 || !/^(?:[a-fA-F0-9]{2})+$/.test(ticket)) throw new Error('Invalid Steam authentication ticket')
    const url = new URL('https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/')
    url.searchParams.set('key', env.STEAM_API_KEY)
    url.searchParams.set('appid', env.STEAM_APP_ID)
    url.searchParams.set('ticket', ticket)
    url.searchParams.set('identity', 'pvp-blocks')
    let response
    try { response = await fetcher(url, { signal: AbortSignal.timeout(8000), redirect: 'error' }) }
    catch { throw new Error('Steam authentication service unavailable') }
    if (!response.ok) throw new Error('Steam authentication rejected')
    const params = (await response.json())?.response?.params
    if (params?.result !== 'OK' || !/^[0-9]{17}$/.test(params?.steamid || '')) throw new Error('Steam authentication rejected')
    return { provider: 'steam', providerAccountId: params.steamid, nickname: `Steam_${params.steamid.slice(-8)}`, email: null, emailVerified: false, avatar: null }
}
