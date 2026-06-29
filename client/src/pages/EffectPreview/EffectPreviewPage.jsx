import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { getEffectPresentationState } from '@/features/tetris/effects/runtime.js'
import { useEffectCatalog } from '@/features/tetris/effects/useEffectCatalog.js'
import EffectBoardLayer from '@/features/tetris/effects/presentation/EffectBoardLayer.jsx'
import EffectPresentationLayer from '@/features/tetris/effects/presentation/EffectPresentationLayer.jsx'
import EffectPreviewPanel from '@/features/tetris/effects/presentation/EffectPreviewPanel.jsx'
import { useEffectPreview } from '@/features/tetris/effects/presentation/useEffectPreview.js'
import { useTetrisControls } from '@/features/tetris/hooks/useTetrisControls.js'
import { useTetrisGameLoop } from '@/features/tetris/hooks/useTetrisGameLoop.js'
import { GAME_MODE_REGISTRY, GAME_MODE_TYPES } from '@/features/tetris/model/gameModes.js'
import {
    getRandomPieceGeneratorForSettings,
    normalizeMatchSettings,
} from '@/features/tetris/model/matchSettings.js'
import { togglePause } from '@/features/tetris/model/tetrisEngine.js'
import ActionsPanel from '@/features/tetris/ui/ActionsPanel.jsx'
import GameLayout from '@/features/tetris/ui/GameLayout.jsx'
import NextPiecePanel from '@/features/tetris/ui/NextPiecePanel.jsx'
import StatsPanel from '@/features/tetris/ui/StatsPanel.jsx'
import useAudio from '@/shared/hooks/useAudio.js'

const DEFAULT_PREVIEW_EFFECT = 'gravity_lock'

const getPreviewEffectKey = (search) => (
    new URLSearchParams(search).get('effectPreview') || DEFAULT_PREVIEW_EFFECT
)

const previewSettings = normalizeMatchSettings({
    abilitiesEnabled: false,
    soloGameDebuffsMockEnabled: false,
    specialBlocksEnabled: false,
})

const EffectPreviewPage = () => {
    const location = useLocation()
    const effectPreviewKey = getPreviewEffectKey(location.search)
    const { playSynthEffect } = useAudio()
    const effectCatalog = useEffectCatalog()
    const randomPieceGenerator = useMemo(
        () => getRandomPieceGeneratorForSettings(previewSettings),
        []
    )
    const {
        boardWithPiece,
        derivedState,
        resetGame,
        setGameState,
    } = useTetrisGameLoop({
        abilitiesEnabled: false,
        paused: false,
        randomPiece: randomPieceGenerator,
    })
    const {
        clearPreviewEffects,
        previewEffect,
    } = useEffectPreview({
        forcePreviewMode: true,
        initialEffectKey: effectPreviewKey,
        setGameState,
    })
    const effectPresentation = useMemo(
        () => getEffectPresentationState(derivedState),
        [derivedState]
    )
    const hasFogPiece = Boolean(effectPresentation.fogPiece)
    const hasScreenShake = Boolean(effectPresentation.screenShake)
    const hasInvisibleCells = effectPresentation.invisibleCells || false

    useTetrisControls({
        disabled: derivedState.isGameOver,
        gameState: derivedState,
        randomPiece: randomPieceGenerator,
        setGameState,
    })

    const handlePauseToggle = () => {
        setGameState((prevState) => togglePause(prevState))
    }

    const boardDecor = (
        <EffectBoardLayer
            activeEffects={derivedState.activeEffects}
            feedback={derivedState.effectFeedback}
        />
    )
    const sidebar = (
        <>
            <NextPiecePanel hidden={hasFogPiece} nextPiece={derivedState.nextPiece} />
            <StatsPanel
                score={derivedState.score}
                lines={derivedState.linesCleared}
                level={derivedState.level}
            />
            <ActionsPanel
                actions={[
                    {
                        key: 'pause',
                        icon: derivedState.isPaused ? 'fa-play' : 'fa-pause',
                        label: derivedState.isPaused ? 'Resume' : 'Pause',
                        onClick: handlePauseToggle,
                        disabled: derivedState.isGameOver,
                        pressed: derivedState.isPaused,
                    },
                    {
                        key: 'restart',
                        icon: 'fa-rotate-right',
                        label: 'Restart',
                        onClick: resetGame,
                    },
                ]}
            />
        </>
    )
    const overlay = (
        <>
            <EffectPreviewPanel
                activeEffectKey={derivedState.activeEffects.at(-1)?.effectKey}
                effects={effectCatalog.effects}
                onClear={clearPreviewEffects}
                onPreview={(effect) => previewEffect(effect, {
                    durationMs: Math.max(15000, effect.durationMs),
                })}
            />
            <EffectPresentationLayer
                activeEffects={derivedState.activeEffects}
                catalog={effectCatalog.effects}
                feedback={derivedState.effectFeedback}
                playSynthEffect={playSynthEffect}
            />
        </>
    )

    if (effectCatalog.isLoading) {
        return <div>Loading effects...</div>
    }

    return (
        <GameLayout
            mode={GAME_MODE_REGISTRY[GAME_MODE_TYPES.SOLO_CLASSIC]}
            score={derivedState.score}
            board={boardWithPiece}
            clearingRows={derivedState.clearingRows}
            boardShellClassName={hasScreenShake ? 'player-board-shell--effect-shake' : ''}
            boardDecor={boardDecor}
            boardInvisibleCells={hasInvisibleCells}
            headerStats={(
                <StatsPanel
                    score={derivedState.score}
                    lines={derivedState.linesCleared}
                    level={derivedState.level}
                />
            )}
            overlay={overlay}
            sidebar={sidebar}
        />
    )
}

export default EffectPreviewPage
