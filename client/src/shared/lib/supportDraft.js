const SUPPORT_DRAFT_HASH_PREFIX = '#pvp-support-draft='
const SUPPORT_DRAFT_CATEGORIES = new Set(['bug', 'idea', 'mode', 'balance', 'other'])

export const readDesktopSupportDraft = (hash = window.location.hash) => {
    if (!hash.startsWith(SUPPORT_DRAFT_HASH_PREFIX)) {
        return null
    }

    try {
        const encodedPayload = hash.slice(SUPPORT_DRAFT_HASH_PREFIX.length)
        const base64 = encodedPayload
            .replaceAll('-', '+')
            .replaceAll('_', '/')
            .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')
        const binary = window.atob(base64)
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
        const payload = JSON.parse(new TextDecoder().decode(bytes))

        if (payload?.source !== 'desktop' || payload?.version !== 1) {
            return null
        }

        const category = SUPPORT_DRAFT_CATEGORIES.has(payload.category) ? payload.category : 'other'
        const message = typeof payload.message === 'string' ? payload.message.trim().slice(0, 2000) : ''

        return { category, message }
    } catch {
        return null
    }
}

export const clearDesktopSupportDraftHash = () => {
    window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`
    )
}
