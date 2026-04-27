import { getRandomPiece, getRandomPieceWithSpecialBlocks } from './getRandomPiece.js'

export const defaultMatchSettings = {
    abilitiesEnabled: true,
    specialBlocksEnabled: false,
    matchType: 'private',
}

export const normalizeMatchSettings = (value) => ({
    abilitiesEnabled: value?.abilitiesEnabled ?? defaultMatchSettings.abilitiesEnabled,
    specialBlocksEnabled: value?.specialBlocksEnabled ?? defaultMatchSettings.specialBlocksEnabled,
    matchType: normalizeMatchType(value?.matchType),
})

const normalizeMatchType = (value) => {
    if (value === 'ranked' || value === 'casual' || value === 'private') {
        return value
    }

    return defaultMatchSettings.matchType
}

export const getRandomPieceGeneratorForSettings = (settings) => {
    const normalizedSettings = normalizeMatchSettings(settings)

    return normalizedSettings.specialBlocksEnabled
        ? getRandomPieceWithSpecialBlocks
        : getRandomPiece
}
