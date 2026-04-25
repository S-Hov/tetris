import { getRandomPiece, getRandomPieceWithSpecialBlocks } from './getRandomPiece.js'

export const defaultMatchSettings = {
    abilitiesEnabled: true,
    specialBlocksEnabled: false,
}

export const normalizeMatchSettings = (value) => ({
    abilitiesEnabled: value?.abilitiesEnabled ?? defaultMatchSettings.abilitiesEnabled,
    specialBlocksEnabled: value?.specialBlocksEnabled ?? defaultMatchSettings.specialBlocksEnabled,
})

export const getRandomPieceGeneratorForSettings = (settings) => {
    const normalizedSettings = normalizeMatchSettings(settings)

    return normalizedSettings.specialBlocksEnabled
        ? getRandomPieceWithSpecialBlocks
        : getRandomPiece
}
