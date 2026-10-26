import { identityDatabase as pool } from './identityDatabase.js'
import { createSteamFriendsService } from '../application/steamFriends.js'
export const steamFriendsService = createSteamFriendsService({
    findConnections: async userIds => (await pool.query("SELECT user_id AS \"userId\", provider_account_id AS \"steamId\" FROM accounts WHERE provider = 'steam' AND user_id = ANY($1::int[])", [userIds])).rows,
    findUsers: async steamIds => (await pool.query("SELECT accounts.provider_account_id AS \"steamId\", users.id AS \"userId\", users.username FROM accounts JOIN users ON users.id = accounts.user_id WHERE accounts.provider = 'steam' AND accounts.provider_account_id = ANY($1::text[])", [steamIds])).rows,
})
