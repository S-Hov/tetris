const SKIN_PRESET_LOADERS = {
    default: () => Promise.resolve(),
    'depth-core': () => import('./presets/depth-core.css'),
    'friend-glow': () => import('./presets/friend-glow.css'),
    'friend-glow-color': () => import('./presets/friend-glow-color.css'),
    'stone-garden': () => import('./presets/stone-garden.css'),
    'night-bloom': () => import('./presets/night-bloom.css'),
    'citrus-arcade': () => import('./presets/citrus-arcade.css'),
    'confetti-circuit': () => import('./presets/confetti-circuit.css'),
    'reed-garden': () => import('./presets/reed-garden.css'),
    'nebula-forge': () => import('./presets/nebula-forge.css'),
    'dragon-vault': () => import('./presets/dragon-vault.css'),
    'celestial-crown': () => import('./presets/celestial-crown.css'),
}

const loadedPresetPromises = new Map()

export const normalizeSkinPreset = (value) => {
    const preset = String(value || 'default').replaceAll('_', '-').toLowerCase()
    return Object.hasOwn(SKIN_PRESET_LOADERS, preset) ? preset : 'default'
}

export const loadSkinPreset = (value) => {
    const preset = normalizeSkinPreset(value)

    if (!loadedPresetPromises.has(preset)) {
        const loadPromise = SKIN_PRESET_LOADERS[preset]().catch((error) => {
            loadedPresetPromises.delete(preset)
            throw error
        })

        loadedPresetPromises.set(preset, loadPromise)
    }

    return loadedPresetPromises.get(preset).then(() => preset)
}

export const loadSkinPresets = (presets) => Promise.all(
    [...new Set(presets.map(normalizeSkinPreset))].map(loadSkinPreset)
)

export const getTetrisSkinClassName = (skinPreset) => (
    `tetris-skin--${normalizeSkinPreset(skinPreset)}`
)
