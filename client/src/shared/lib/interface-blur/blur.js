export const INTERFACE_BLUR_STORAGE_KEY = 'interfaceBlurSettings'

const INTERFACE_BLUR_CHANGE_EVENT = 'interfaceblurchange'

export const BLUR_VARIABLES = [
    {
        key: 'easy',
        cssVariable: '--easy-blur',
        defaultValue: 6,
        max: 40,
    },
    {
        key: 'medium',
        cssVariable: '--medium-blur',
        defaultValue: 12,
        max: 40,
    },
    {
        key: 'hard',
        cssVariable: '--hard-blur',
        defaultValue: 20,
        max: 40,
    },
]

const normalizeValue = (value, fallbackValue = 0) => {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
        return fallbackValue
    }

    return Math.max(0, Math.min(40, numberValue))
}

export const getDefaultInterfaceBlurSettings = () => BLUR_VARIABLES.reduce((settings, variable) => ({
    ...settings,
    [variable.key]: variable.defaultValue,
}), {})

export const normalizeInterfaceBlurSettings = (settings) => {
    const defaults = getDefaultInterfaceBlurSettings()
    const source = settings && typeof settings === 'object' ? settings : {}

    return BLUR_VARIABLES.reduce((normalizedSettings, variable) => ({
        ...normalizedSettings,
        [variable.key]: normalizeValue(source[variable.key], defaults[variable.key]),
    }), {})
}

export const getStoredInterfaceBlurSettings = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawSettings = window.localStorage.getItem(INTERFACE_BLUR_STORAGE_KEY)
        return rawSettings ? normalizeInterfaceBlurSettings(JSON.parse(rawSettings)) : null
    } catch {
        return null
    }
}

export const getInterfaceBlurSettings = () => (
    getStoredInterfaceBlurSettings() || getDefaultInterfaceBlurSettings()
)

export const applyInterfaceBlurSettings = (settings) => {
    const nextSettings = normalizeInterfaceBlurSettings(settings)

    if (typeof document !== 'undefined') {
        BLUR_VARIABLES.forEach((variable) => {
            document.documentElement.style.setProperty(variable.cssVariable, `blur(${nextSettings[variable.key]}px)`)
        })
    }

    return nextSettings
}

export const saveInterfaceBlurSettings = (settings) => {
    const nextSettings = applyInterfaceBlurSettings(settings)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(INTERFACE_BLUR_STORAGE_KEY, JSON.stringify(nextSettings))
        } catch {
            // Blur preferences still apply in the current tab when localStorage is unavailable.
        }

        window.dispatchEvent(new CustomEvent(INTERFACE_BLUR_CHANGE_EVENT, {
            detail: { settings: nextSettings },
        }))
    }

    return nextSettings
}

export const initInterfaceBlurSettings = () => saveInterfaceBlurSettings(getInterfaceBlurSettings())

export const INTERFACE_BLUR_EVENTS = {
    CHANGE: INTERFACE_BLUR_CHANGE_EVENT,
}
