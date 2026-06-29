import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { MATCH_PLAY_MODES } from '@/features/tetris/model/matchPlayModes.js'
import { normalizeMatchSettings } from '@/features/tetris/model/matchSettings.js'
import MatchPage from '@/pages/Match/MatchPage.jsx'

const DEFAULT_PREVIEW_EFFECT = 'gravity_lock'

const getPreviewEffectKey = (search) => (
    new URLSearchParams(search).get('effectPreview') || DEFAULT_PREVIEW_EFFECT
)

const EffectPreviewPage = () => {
    const location = useLocation()
    const effectPreviewKey = getPreviewEffectKey(location.search)
    const settings = useMemo(() => normalizeMatchSettings({
        abilitiesEnabled: false,
        soloGameDebuffsMockEnabled: false,
        specialBlocksEnabled: false,
    }), [])

    return (
        <MatchPage
            effectPreviewKey={effectPreviewKey}
            forceEffectPreview
            initialSettings={settings}
            playMode={MATCH_PLAY_MODES.SOLO}
        />
    )
}

export default EffectPreviewPage
