export const DEFAULT_ACCOUNT_SETTINGS_SECTION = 'general'

export const ACCOUNT_SETTINGS_SECTIONS = [
    { key: 'general', icon: 'fas fa-sliders', labelKey: 'accountSettings.tabs.general' },
    { key: 'account', icon: 'fas fa-user', labelKey: 'accountSettings.tabs.account' },
    { key: 'privacy', icon: 'fas fa-user-shield', labelKey: 'accountSettings.tabs.privacy' },
    { key: 'security', icon: 'fas fa-shield-alt', labelKey: 'accountSettings.tabs.security' },
]

export const ACCOUNT_SETTINGS_SECTION_KEYS = ACCOUNT_SETTINGS_SECTIONS.map((section) => section.key)

export const AVATAR_MAX_SIZE = 2 * 1024 * 1024

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/webm']

export const AVATAR_ACCEPT = AVATAR_TYPES.join(',')
