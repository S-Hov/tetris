export const INTERFACE_SCALE_STORAGE_KEY = 'interfaceScale'

const INTERFACE_SCALE_CHANGE_EVENT = 'interfacescalechange'

export const INTERFACE_SCALE_MIN = 80
export const INTERFACE_SCALE_MAX = 120
export const INTERFACE_SCALE_STEP = 5
export const DEFAULT_INTERFACE_SCALE = 100

const normalizeScale = (value) => {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
        return DEFAULT_INTERFACE_SCALE
    }

    const clampedValue = Math.max(INTERFACE_SCALE_MIN, Math.min(INTERFACE_SCALE_MAX, numberValue))

    return Math.round(clampedValue / INTERFACE_SCALE_STEP) * INTERFACE_SCALE_STEP
}

export const getStoredInterfaceScale = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawValue = window.localStorage.getItem(INTERFACE_SCALE_STORAGE_KEY)

        return rawValue ? normalizeScale(rawValue) : null
    } catch {
        return null
    }
}

export const getInterfaceScale = () => getStoredInterfaceScale() || DEFAULT_INTERFACE_SCALE

export const applyInterfaceScale = (scale) => {
    const nextScale = normalizeScale(scale)

    if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--interface-scale', String(nextScale / 100))
        document.body.style.zoom = String(nextScale / 100)
    }

    return nextScale
}

export const saveInterfaceScale = (scale) => {
    const nextScale = applyInterfaceScale(scale)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(INTERFACE_SCALE_STORAGE_KEY, String(nextScale))
        } catch {
            // Scale preference still applies in the current tab when localStorage is unavailable.
        }

        window.dispatchEvent(new CustomEvent(INTERFACE_SCALE_CHANGE_EVENT, {
            detail: { scale: nextScale },
        }))
    }

    return nextScale
}

export const initInterfaceScale = () => saveInterfaceScale(getInterfaceScale())

export const INTERFACE_SCALE_EVENTS = {
    CHANGE: INTERFACE_SCALE_CHANGE_EVENT,
}
