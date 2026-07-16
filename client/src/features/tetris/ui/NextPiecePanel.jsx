import { getTetrisSkinClassName } from '../skins/skinPresetLoader.js'
import SkinCellLayers from '../skins/SkinCellLayers.jsx'

const NextPiecePanel = ({ hidden = false, nextPiece, skinPreset = 'default' }) => {
    return (
        <section className="game-panel game-next-piece-panel">
            <h3 className="game-panel__title"><i className="fa-solid fa-eye"></i> Next Piece</h3>
            <div className={[
                'game-next-piece-panel__preview',
                hidden ? 'game-next-piece-panel__preview--hidden' : '',
            ].filter(Boolean).join(' ')}
            >
                <div
                    className={`game-next-piece-grid ${getTetrisSkinClassName(skinPreset)}`}
                    style={{
                        gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, var(--next-piece-cell-size))`,
                        gridTemplateRows: `repeat(${nextPiece.shape.length}, var(--next-piece-cell-size))`,
                    }}
                >
                    {nextPiece.shape.flatMap((row, rowIndex) =>
                        row.map((cell, cellIndex) => (
                            <div
                                key={`${rowIndex}-${cellIndex}`}
                                className={`game-next-piece-cell ${cell ? `cell--${nextPiece.type} filled` : ''}`}
                            >
                                {cell ? <SkinCellLayers /> : null}
                            </div>
                        ))
                    )}
                </div>
                {hidden ? <span className="game-next-piece-panel__fog">???</span> : null}
            </div>
        </section>
    )
}

export default NextPiecePanel
