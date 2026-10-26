import test from 'node:test'
import assert from 'node:assert/strict'
import { verifySteamTicket } from '../../src/modules/identity/application/steamTicket.js'
const env = { STEAM_APP_ID: '123456', STEAM_API_KEY: 'fixture-not-a-real-key' }
const ticket = 'ab'.repeat(32)
test('Steam ticket verification uses server AppID, fixed identity and Valve endpoint', async () => {
    const profile = await verifySteamTicket(ticket, { env, fetcher: async url => {
        assert.equal(url.origin, 'https://partner.steam-api.com')
        assert.equal(url.searchParams.get('appid'), env.STEAM_APP_ID)
        assert.equal(url.searchParams.get('identity'), 'pvp-blocks')
        return { ok: true, json: async () => ({ response: { params: { result: 'OK', steamid: '76561198000000001' } } }) }
    } })
    assert.equal(profile.providerAccountId, '76561198000000001')
    assert.equal(profile.emailVerified, false)
})
test('Missing configuration, malformed tickets and invalid Valve responses fail closed', async () => {
    await assert.rejects(verifySteamTicket(ticket, { env: {} }))
    await assert.rejects(verifySteamTicket('forged', { env, fetcher: () => assert.fail('invalid tickets never reach Valve') }))
    await assert.rejects(verifySteamTicket(ticket, { env, fetcher: async () => ({ ok: true, json: async () => ({ response: { params: { result: 'Fail', steamid: '76561198000000001' } } }) }) }))
})
import { createSteamFriendsService } from '../../src/modules/identity/application/steamFriends.js'
test('Steam friendship uses server-verified accounts and recipient friend list; failures grant nothing', async () => {
    const accounts = [{userId:1,steamId:'76561198000000001'},{userId:2,steamId:'76561198000000002'}]
    let requests=0
    const service = createSteamFriendsService({ env, findConnections:async()=>accounts, findUsers:async ids=>ids, fetcher:async url=>{requests++;assert.equal(url.searchParams.get('steamid'),accounts[1].steamId);return {ok:true,json:async()=>({friendslist:{friends:[{steamid:accounts[0].steamId}]}})}} })
    assert.equal(await service.areFriends(1,2),true)
    assert.equal(await service.areFriends(1,2),true)
    assert.equal(requests,1,'friend lookup is cached')
    const unavailable = createSteamFriendsService({env,findConnections:async()=>accounts,findUsers:async()=>[],fetcher:async()=>({ok:false})})
    assert.equal(await unavailable.areFriends(1,2),false)
})
