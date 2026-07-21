export const ONBOARDING_STORAGE_KEY = 'pvpBlocksOnboarding'
export const ONBOARDING_VERSION = 1

export const ONBOARDING_STAGES = {
    SETUP: 'setup',
    TUTORIAL: 'tutorial',
    CLOSED: 'closed',
}

export const getOnboardingState = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawState = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)

        if (!rawState) {
            return null
        }

        const state = JSON.parse(rawState)

        return state?.version === ONBOARDING_VERSION ? state : null
    } catch {
        return null
    }
}

export const getInitialOnboardingStage = () => {
    const state = getOnboardingState()

    if (!state) {
        return ONBOARDING_STAGES.SETUP
    }

    if (state.status === 'completed' && !state.tutorialCompleted) {
        return ONBOARDING_STAGES.TUTORIAL
    }

    return ONBOARDING_STAGES.CLOSED
}

const saveOnboardingState = (state) => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
            version: ONBOARDING_VERSION,
            ...state,
        }))
    } catch {
        // The onboarding can still be closed for the current session when storage is unavailable.
    }
}

export const dismissOnboarding = () => saveOnboardingState({
    status: 'dismissed',
    tutorialCompleted: true,
})

export const completeOnboardingSetup = () => saveOnboardingState({
    status: 'completed',
    tutorialCompleted: false,
})

export const completeOnboardingTutorial = () => saveOnboardingState({
    status: 'completed',
    tutorialCompleted: true,
})
