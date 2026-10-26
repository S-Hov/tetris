import { steamFriendsService } from '../../infrastructure/steamFriendsService.js'
import crypto from 'node:crypto'
import { identityApplication } from '../../application/identityApplication.js'
import { verifySteamTicket } from '../../application/steamTicket.js'
import { setLoginSession } from './sessionCookies.js'
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler.js'
import { badRequest, forbidden } from '../../../../shared/responses/errors.js'

const used = new Map(), attempts = new Map()
const authenticate = link => asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    if (!process.env.STEAM_APP_ID || !process.env.STEAM_API_KEY) throw badRequest('COMMON.BAD_REQUEST')
    const now = Date.now(), key = req.ip || 'unknown'
    for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id)
    for (const [id, expiry] of used) if (expiry <= now) used.delete(id)
    const attempt = attempts.get(key) || { count: 0, until: now + 60000 }
    if (++attempt.count > 10 || attempts.size > 10000 || used.size > 10000) throw forbidden('COMMON.FORBIDDEN')
    attempts.set(key, attempt)
    let profile
    try { profile = await verifySteamTicket(req.body?.ticket) } catch { throw forbidden('COMMON.FORBIDDEN') }
    const fingerprint = crypto.createHash('sha256').update(req.body.ticket).digest('hex')
    if (used.has(fingerprint)) throw forbidden('COMMON.FORBIDDEN')
    used.set(fingerprint, now + 300000)
    const result = await identityApplication.handleOAuthLogin({ provider: 'steam', oauthProfile: profile, mode: link ? 'link' : 'login', userId: link ? req.user.id : null })
    await identityApplication.createAuthLog({ userId: result.user.id, eventType: link ? 'steam_link_success' : 'steam_login_success', ipAddress: req.ip || null, userAgent: req.get('user-agent') || null })
    const user = await identityApplication.getSessionUser(result.user.id)
    const session = link ? {} : setLoginSession(req, res, result.user)
    res.json({ success: true, message: 'Steam authentication complete', data: { user, ...session } })
})
export const loginSteam = authenticate(false)
export const linkSteam = authenticate(true)

export const getSteamFriends = asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json({ success: true, message: 'Steam friends resolved', data: await steamFriendsService.list(req.user.id) })
})
