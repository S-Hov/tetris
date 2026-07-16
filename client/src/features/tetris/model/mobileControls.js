export const MOBILE_CONTROLS_STORAGE_KEY = 'pvp-blocks.mobile-controls'

export const MOBILE_CONTROL_METHODS = {
    GESTURES: 'gestures',
    BUTTONS: 'buttons',
}

export const TOUCH_ACTIONS = {
    NONE: 'none',
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    SOFT_DROP: 'softDrop',
    ROTATE: 'rotate',
    HARD_DROP: 'hardDrop',
}

export const TOUCH_GESTURES = {
    SWIPE_LEFT: 'swipeLeft',
    SWIPE_RIGHT: 'swipeRight',
    SWIPE_DOWN_SHORT: 'swipeDownShort',
    SWIPE_DOWN_LONG: 'swipeDownLong',
    TAP: 'tap',
    DOUBLE_TAP: 'doubleTap',
}

export const MOBILE_BUTTON_IDS = {
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    SOFT_DROP: 'softDrop',
    ROTATE: 'rotate',
    HARD_DROP: 'hardDrop',
}

export const MOBILE_BUTTON_ORDER = [
    MOBILE_BUTTON_IDS.MOVE_LEFT,
    MOBILE_BUTTON_IDS.MOVE_RIGHT,
    MOBILE_BUTTON_IDS.SOFT_DROP,
    MOBILE_BUTTON_IDS.ROTATE,
    MOBILE_BUTTON_IDS.HARD_DROP,
]

export const TOUCH_ACTION_LABELS = {
    [TOUCH_ACTIONS.NONE]: 'Без действия',
    [TOUCH_ACTIONS.MOVE_LEFT]: 'Движение влево',
    [TOUCH_ACTIONS.MOVE_RIGHT]: 'Движение вправо',
    [TOUCH_ACTIONS.SOFT_DROP]: 'Мягкое падение',
    [TOUCH_ACTIONS.ROTATE]: 'Вращение фигуры',
    [TOUCH_ACTIONS.HARD_DROP]: 'Мгновенное падение',
}

export const TOUCH_GESTURE_LABELS = {
    [TOUCH_GESTURES.SWIPE_LEFT]: 'Свайп влево',
    [TOUCH_GESTURES.SWIPE_RIGHT]: 'Свайп вправо',
    [TOUCH_GESTURES.SWIPE_DOWN_SHORT]: 'Короткий свайп вниз',
    [TOUCH_GESTURES.SWIPE_DOWN_LONG]: 'Длинный свайп вниз',
    [TOUCH_GESTURES.TAP]: 'Касание',
    [TOUCH_GESTURES.DOUBLE_TAP]: 'Двойное касание',
}

export const MOBILE_BUTTON_LABELS = {
    [MOBILE_BUTTON_IDS.MOVE_LEFT]: 'Left',
    [MOBILE_BUTTON_IDS.MOVE_RIGHT]: 'Right',
    [MOBILE_BUTTON_IDS.SOFT_DROP]: 'Down',
    [MOBILE_BUTTON_IDS.ROTATE]: 'Rotate',
    [MOBILE_BUTTON_IDS.HARD_DROP]: 'Drop',
}

export const DEFAULT_MOBILE_BUTTON_LAYOUT = {
    [MOBILE_BUTTON_IDS.MOVE_LEFT]: {
        action: TOUCH_ACTIONS.MOVE_LEFT,
        label: '<',
        x: 14,
        y: 92,
        size: 50,
    },
    [MOBILE_BUTTON_IDS.MOVE_RIGHT]: {
        action: TOUCH_ACTIONS.MOVE_RIGHT,
        label: '>',
        x: 35,
        y: 92,
        size: 50,
    },
    [MOBILE_BUTTON_IDS.SOFT_DROP]: {
        action: TOUCH_ACTIONS.SOFT_DROP,
        label: 'v',
        x: 24,
        y: 82,
        size: 50,
    },
    [MOBILE_BUTTON_IDS.ROTATE]: {
        action: TOUCH_ACTIONS.ROTATE,
        label: 'R',
        x: 69,
        y: 82,
        size: 62,
    },
    [MOBILE_BUTTON_IDS.HARD_DROP]: {
        action: TOUCH_ACTIONS.HARD_DROP,
        label: 'DROP',
        x: 86,
        y: 92,
        size: 62,
    },
}

export const DEFAULT_MOBILE_CONTROL_SETTINGS = {
    description: 'PVP Tetris mobile control settings. Gestures are enabled by default for touch screens.',
    method: MOBILE_CONTROL_METHODS.BUTTONS,
    sensitivity: {
        minSwipe: 24,
        repeatStep: 32,
        tapMaxTime: 180,
        tapMaxMove: 10,
    },
    gestureActions: {
        [TOUCH_GESTURES.SWIPE_LEFT]: TOUCH_ACTIONS.MOVE_LEFT,
        [TOUCH_GESTURES.SWIPE_RIGHT]: TOUCH_ACTIONS.MOVE_RIGHT,
        [TOUCH_GESTURES.SWIPE_DOWN_SHORT]: TOUCH_ACTIONS.SOFT_DROP,
        [TOUCH_GESTURES.SWIPE_DOWN_LONG]: TOUCH_ACTIONS.HARD_DROP,
        [TOUCH_GESTURES.TAP]: TOUCH_ACTIONS.ROTATE,
        [TOUCH_GESTURES.DOUBLE_TAP]: TOUCH_ACTIONS.HARD_DROP,
    },
    buttonControls: {
        opacity: 91,
        layout: DEFAULT_MOBILE_BUTTON_LAYOUT,
    },
}

const normalizeMobileButtonLayout = (layout = {}) => (
    MOBILE_BUTTON_ORDER.reduce((normalizedLayout, buttonId) => {
        normalizedLayout[buttonId] = {
            ...DEFAULT_MOBILE_BUTTON_LAYOUT[buttonId],
            ...(layout[buttonId] || {}),
        }

        return normalizedLayout
    }, {})
)

export const normalizeMobileControlSettings = (settings = {}) => ({
    ...DEFAULT_MOBILE_CONTROL_SETTINGS,
    ...settings,
    sensitivity: {
        ...DEFAULT_MOBILE_CONTROL_SETTINGS.sensitivity,
        ...(settings.sensitivity || {}),
    },
    gestureActions: {
        ...DEFAULT_MOBILE_CONTROL_SETTINGS.gestureActions,
        ...(settings.gestureActions || {}),
    },
    buttonControls: {
        ...DEFAULT_MOBILE_CONTROL_SETTINGS.buttonControls,
        ...(settings.buttonControls || {}),
        layout: normalizeMobileButtonLayout(settings.buttonControls?.layout),
    },
})

export const loadMobileControlSettings = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_MOBILE_CONTROL_SETTINGS
    }

    const storedSettings = window.localStorage.getItem(MOBILE_CONTROLS_STORAGE_KEY)

    if (!storedSettings) {
        window.localStorage.setItem(
            MOBILE_CONTROLS_STORAGE_KEY,
            JSON.stringify(DEFAULT_MOBILE_CONTROL_SETTINGS)
        )

        return DEFAULT_MOBILE_CONTROL_SETTINGS
    }

    try {
        return normalizeMobileControlSettings(JSON.parse(storedSettings))
    } catch {
        window.localStorage.setItem(
            MOBILE_CONTROLS_STORAGE_KEY,
            JSON.stringify(DEFAULT_MOBILE_CONTROL_SETTINGS)
        )

        return DEFAULT_MOBILE_CONTROL_SETTINGS
    }
}

export const saveMobileControlSettings = (settings) => {
    const normalizedSettings = normalizeMobileControlSettings(settings)

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(MOBILE_CONTROLS_STORAGE_KEY, JSON.stringify(normalizedSettings))
    }

    return normalizedSettings
}
