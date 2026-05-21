export const PC_CONTROLS_STORAGE_KEY = 'pvp-tetris.pc-controls'

export const PC_CONTROL_ACTIONS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    SOFT_DROP: 'softDrop',
    ROTATE: 'rotate',
    HARD_DROP: 'hardDrop',
    PAUSE: 'pause',
}

export const PC_CONTROL_ACTION_LABELS = {
    [PC_CONTROL_ACTIONS.MOVE_LEFT]: 'Движение влево',
    [PC_CONTROL_ACTIONS.MOVE_RIGHT]: 'Движение вправо',
    [PC_CONTROL_ACTIONS.SOFT_DROP]: 'Мягкое падение',
    [PC_CONTROL_ACTIONS.ROTATE]: 'Вращение фигуры',
    [PC_CONTROL_ACTIONS.HARD_DROP]: 'Мгновенное падение',
    [PC_CONTROL_ACTIONS.PAUSE]: 'Пауза',
}

export const PC_CONTROL_ACTION_ORDER = [
    PC_CONTROL_ACTIONS.MOVE_LEFT,
    PC_CONTROL_ACTIONS.MOVE_RIGHT,
    PC_CONTROL_ACTIONS.SOFT_DROP,
    PC_CONTROL_ACTIONS.ROTATE,
    PC_CONTROL_ACTIONS.HARD_DROP,
    PC_CONTROL_ACTIONS.PAUSE,
]

export const DEFAULT_PC_CONTROL_SETTINGS = {
    description: 'PVP Tetris PC control settings. Defaults match the original keyboard controls.',
    bindings: {
        [PC_CONTROL_ACTIONS.MOVE_LEFT]: ['ArrowLeft', 'KeyA'],
        [PC_CONTROL_ACTIONS.MOVE_RIGHT]: ['ArrowRight', 'KeyD'],
        [PC_CONTROL_ACTIONS.SOFT_DROP]: ['ArrowDown', 'KeyS'],
        [PC_CONTROL_ACTIONS.ROTATE]: ['ArrowUp', 'KeyW'],
        [PC_CONTROL_ACTIONS.HARD_DROP]: ['Space'],
        [PC_CONTROL_ACTIONS.PAUSE]: ['KeyP', 'Escape'],
    },
}

export const normalizePcControlSettings = (settings = {}) => ({
    ...DEFAULT_PC_CONTROL_SETTINGS,
    ...settings,
    bindings: PC_CONTROL_ACTION_ORDER.reduce((bindings, action) => {
        const value = settings.bindings?.[action] ?? DEFAULT_PC_CONTROL_SETTINGS.bindings[action]

        bindings[action] = Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean)

        return bindings
    }, {}),
})

export const loadPcControlSettings = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_PC_CONTROL_SETTINGS
    }

    const storedSettings = window.localStorage.getItem(PC_CONTROLS_STORAGE_KEY)

    if (!storedSettings) {
        window.localStorage.setItem(PC_CONTROLS_STORAGE_KEY, JSON.stringify(DEFAULT_PC_CONTROL_SETTINGS))

        return DEFAULT_PC_CONTROL_SETTINGS
    }

    try {
        return normalizePcControlSettings(JSON.parse(storedSettings))
    } catch {
        window.localStorage.setItem(PC_CONTROLS_STORAGE_KEY, JSON.stringify(DEFAULT_PC_CONTROL_SETTINGS))

        return DEFAULT_PC_CONTROL_SETTINGS
    }
}

export const savePcControlSettings = (settings) => {
    const normalizedSettings = normalizePcControlSettings(settings)

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(PC_CONTROLS_STORAGE_KEY, JSON.stringify(normalizedSettings))
    }

    return normalizedSettings
}

export const getActionForCode = (code, settings = loadPcControlSettings()) => (
    PC_CONTROL_ACTION_ORDER.find((action) => settings.bindings[action]?.includes(code)) || null
)

export const getAllControlCodes = (settings = loadPcControlSettings()) => (
    Object.values(settings.bindings).flat()
)

export const formatKeyCode = (code) => {
    if (!code) {
        return 'Не назначено'
    }

    const labels = {
        ArrowLeft: '←',
        ArrowRight: '→',
        ArrowDown: '↓',
        ArrowUp: '↑',
        Space: 'Пробел',
        Escape: 'Esc',
        Enter: 'Enter',
        Backspace: 'Backspace',
        Tab: 'Tab',
        ShiftLeft: 'Shift',
        ShiftRight: 'Shift',
        ControlLeft: 'Ctrl',
        ControlRight: 'Ctrl',
        AltLeft: 'Alt',
        AltRight: 'Alt',
    }

    if (labels[code]) {
        return labels[code]
    }

    if (code.startsWith('Key')) {
        return code.slice(3)
    }

    if (code.startsWith('Digit')) {
        return code.slice(5)
    }

    if (code.startsWith('Numpad')) {
        return `Num ${code.slice(6)}`
    }

    return code
}
