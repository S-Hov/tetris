import assert from 'node:assert/strict'
import test from 'node:test'

import {
    decryptChatMessage,
    encryptChatMessage,
} from '../services/chatCryptoService.js'
import {
    CHAT_TEXT_MAX_LENGTH,
    normalizeChatText,
} from '../services/chatService.js'

const withEncryptionKey = async (key, fn) => {
    const previousKey = process.env.CHAT_ENCRYPTION_KEY
    process.env.CHAT_ENCRYPTION_KEY = key

    try {
        await fn()
    } finally {
        if (previousKey === undefined) {
            delete process.env.CHAT_ENCRYPTION_KEY
        } else {
            process.env.CHAT_ENCRYPTION_KEY = previousKey
        }
    }
}

test('chat messages are encrypted and decrypted with AES-GCM', async () => {
    await withEncryptionKey('0123456789abcdef0123456789abcdef', async () => {
        const text = 'Private hello'
        const encrypted = encryptChatMessage(text)

        assert.notEqual(encrypted.bodyCiphertext, text)
        assert.ok(encrypted.bodyIv)
        assert.ok(encrypted.bodyAuthTag)
        assert.equal(decryptChatMessage(encrypted), text)
    })
})

test('chat encryption rejects missing or invalid keys', async () => {
    await withEncryptionKey('short-key', async () => {
        assert.throws(
            () => encryptChatMessage('hello'),
            /CHAT.ENCRYPTION_KEY_INVALID/
        )
    })
})

test('chat text normalization trims whitespace and keeps max length explicit', () => {
    assert.equal(normalizeChatText('  hello  '), 'hello')
    assert.equal(CHAT_TEXT_MAX_LENGTH, 4000)
})
