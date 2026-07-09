import crypto from 'crypto'

import { internal } from '../helpers/error.helper.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_BYTES = 32

let cachedKey = null
let cachedRawKey = null

const decodeKey = (rawKey) => {
    const value = String(rawKey || '').trim()

    if (!value) {
        return null
    }

    if (/^[a-f0-9]{64}$/i.test(value)) {
        return Buffer.from(value, 'hex')
    }

    try {
        const decoded = Buffer.from(value, 'base64')

        if (decoded.length === KEY_BYTES) {
            return decoded
        }
    } catch {
        // Fall through to utf8 handling.
    }

    const utf8Key = Buffer.from(value, 'utf8')

    return utf8Key.length === KEY_BYTES ? utf8Key : null
}

export const getChatEncryptionKey = () => {
    const rawKey = process.env.CHAT_ENCRYPTION_KEY || ''

    if (cachedKey && cachedRawKey === rawKey) {
        return cachedKey
    }

    const key = decodeKey(rawKey)

    if (!key) {
        throw internal('CHAT.ENCRYPTION_KEY_INVALID')
    }

    cachedRawKey = rawKey
    cachedKey = key

    return key
}

export const encryptChatMessage = (plainText) => {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, getChatEncryptionKey(), iv, {
        authTagLength: AUTH_TAG_LENGTH,
    })
    const ciphertext = Buffer.concat([
        cipher.update(String(plainText), 'utf8'),
        cipher.final(),
    ])

    return {
        bodyCiphertext: ciphertext.toString('base64'),
        bodyIv: iv.toString('base64'),
        bodyAuthTag: cipher.getAuthTag().toString('base64'),
    }
}

export const decryptChatMessage = ({ bodyCiphertext, bodyIv, bodyAuthTag }) => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getChatEncryptionKey(),
        Buffer.from(bodyIv, 'base64'),
        { authTagLength: AUTH_TAG_LENGTH }
    )

    decipher.setAuthTag(Buffer.from(bodyAuthTag, 'base64'))

    return Buffer.concat([
        decipher.update(Buffer.from(bodyCiphertext, 'base64')),
        decipher.final(),
    ]).toString('utf8')
}
