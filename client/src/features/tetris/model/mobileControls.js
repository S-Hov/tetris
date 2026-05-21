export const MOBILE_CONTROLS_STORAGE_KEY = 'pvp-tetris.mobile-controls'

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

export const DEFAULT_MOBILE_CONTROL_SETTINGS = {
    description: 'PVP Tetris mobile control settings. Gestures are enabled by default for touch screens.',
    method: MOBILE_CONTROL_METHODS.GESTURES,
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
}

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
