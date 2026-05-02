import { useLocation } from 'react-router-dom'

import { MATCH_PLAY_MODES } from '@/features/tetris/model/matchPlayModes.js'
import { normalizeMatchSettings } from '@/features/tetris/model/matchSettings.js'
import MatchPage from '@/pages/Match/MatchPage.jsx'

const GamePage = () => {
    const location = useLocation()
    const settings = normalizeMatchSettings({
        abilitiesEnabled: false,
        soloGameDebuffsMockEnabled: location.state?.roomSettings?.soloGameDebuffsMockEnabled ?? false,
        specialBlocksEnabled: location.state?.roomSettings?.specialBlocksEnabled ?? false,
    })

    return (
        <MatchPage
            playMode={MATCH_PLAY_MODES.SOLO}
            initialSettings={settings}
        />
    )
}

export default GamePage
