export const feedbackTypes = [
    { value: 'bug', labelKey: 'support.feedbackTypes.bug', icon: 'fas fa-bug' },
    { value: 'idea', labelKey: 'support.feedbackTypes.idea', icon: 'fas fa-lightbulb' },
    { value: 'mode', labelKey: 'support.feedbackTypes.mode', icon: 'fas fa-gamepad' },
    { value: 'balance', labelKey: 'support.feedbackTypes.balance', icon: 'fas fa-balance-scale' },
    { value: 'other', labelKey: 'support.feedbackTypes.other', icon: 'fas fa-comment-dots' },
]

export const faqItems = [
    'rating',
    'disconnect',
    'report',
    'progress',
    'chat',
]

export const contactItems = [
    {
        titleKey: 'support.contacts.telegram',
        text: '@pvptetris_support_bot',
        icon: 'fa-brands fa-telegram',
        href: 'https://t.me/pvptetris_support_bot',
    },
    {
        titleKey: 'support.contacts.email',
        text: 'support.pvptetris@gmail.com',
        icon: 'fa-solid fa-envelope',
        href: 'mailto:support.pvptetris@gmail.com',
    },
]

export const initialSuccessState = {
    channel: '',
    telegramUrl: '',
}
