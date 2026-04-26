import { MATCH_PLAY_MODES } from '@/features/tetris/model/matchPlayModes.js'
import MatchPage from '@/pages/Match/MatchPage.jsx'

const GamePage = () => (
    <MatchPage
        playMode={MATCH_PLAY_MODES.SOLO}
        initialSettings={{
            abilitiesEnabled: false,
            specialBlocksEnabled: false,
        }}
    />
)

export default GamePage
