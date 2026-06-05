export const INTERFACE_RADIUS_STORAGE_KEY = 'interfaceRadiusSettings'

const INTERFACE_RADIUS_CHANGE_EVENT = 'interfaceradiuschange'

export const RADIUS_UNITS = {
    PX: 'px',
    PERCENT: '%',
}

export const RADIUS_VARIABLES = [
    {
        key: 'panel',
        cssVariable: '--radius-panel',
        defaultValue: 28,
        defaultUnit: RADIUS_UNITS.PX,
    },
    {
        key: 'card1',
        cssVariable: '--radius-card-1',
        defaultValue: 18,
        defaultUnit: RADIUS_UNITS.PX,
    },
    {
        key: 'card2',
        cssVariable: '--radius-card-2',
        defaultValue: 8,
        defaultUnit: RADIUS_UNITS.PX,
    },
]

const normalizeUnit = (unit, fallbackUnit = RADIUS_UNITS.PX) => (
    Object.values(RADIUS_UNITS).includes(unit) ? unit : fallbackUnit
)

const normalizeValue = (value, fallbackValue = 0) => {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
        return fallbackValue
    }

    return Math.max(0, Math.min(100, numberValue))
}

export const getDefaultInterfaceRadiusSettings = () => RADIUS_VARIABLES.reduce((settings, variable) => ({
    ...settings,
    [variable.key]: {
        unit: variable.defaultUnit,
        value: variable.defaultValue,
    },
}), {})

export const normalizeInterfaceRadiusSettings = (settings) => {
    const defaults = getDefaultInterfaceRadiusSettings()
    const source = settings && typeof settings === 'object' ? settings : {}

    return RADIUS_VARIABLES.reduce((normalizedSettings, variable) => {
        const currentValue = source[variable.key]
        const currentObject = currentValue && typeof currentValue === 'object' ? currentValue : {}
        const defaultSetting = defaults[variable.key]

        return {
            ...normalizedSettings,
            [variable.key]: {
                unit: normalizeUnit(currentObject.unit, defaultSetting.unit),
                value: normalizeValue(currentObject.value, defaultSetting.value),
            },
        }
    }, {})
}

export const getStoredInterfaceRadiusSettings = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawSettings = window.localStorage.getItem(INTERFACE_RADIUS_STORAGE_KEY)
        return rawSettings ? normalizeInterfaceRadiusSettings(JSON.parse(rawSettings)) : null
    } catch {
        return null
    }
}

export const getInterfaceRadiusSettings = () => (
    getStoredInterfaceRadiusSettings() || getDefaultInterfaceRadiusSettings()
)

export const applyInterfaceRadiusSettings = (settings) => {
    const nextSettings = normalizeInterfaceRadiusSettings(settings)

    if (typeof document !== 'undefined') {
        RADIUS_VARIABLES.forEach((variable) => {
            const setting = nextSettings[variable.key]
            document.documentElement.style.setProperty(variable.cssVariable, `${setting.value}${setting.unit}`)
        })
    }

    return nextSettings
}

export const saveInterfaceRadiusSettings = (settings) => {
    const nextSettings = applyInterfaceRadiusSettings(settings)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(INTERFACE_RADIUS_STORAGE_KEY, JSON.stringify(nextSettings))
        } catch {
            // Radius preferences still apply in the current tab when localStorage is unavailable.
        }

        window.dispatchEvent(new CustomEvent(INTERFACE_RADIUS_CHANGE_EVENT, {
            detail: { settings: nextSettings },
        }))
    }

    return nextSettings
}

export const initInterfaceRadiusSettings = () => saveInterfaceRadiusSettings(getInterfaceRadiusSettings())

export const INTERFACE_RADIUS_EVENTS = {
    CHANGE: INTERFACE_RADIUS_CHANGE_EVENT,
}
