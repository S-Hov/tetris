import { createBoard } from '../model/createBoard.js'

import './TetrisBoard.css'

const shouldHideCell = (rowIndex, cellIndex, settings) => (
    ((rowIndex * 17 + cellIndex * 31) % settings.hiddenModulo) < settings.hiddenThreshold
)

const TetrisBoard = ({
    board,
    clearingRows = [],
    compact = false,
    className = '',
    invisibleCells = false,
    style,
}) => {
    const safeBoard = Array.isArray(board) ? board : createBoard()
    const invisibleCellSettings = typeof invisibleCells === 'object'
        ? invisibleCells
        : {
            hiddenModulo: 11,
            hiddenThreshold: 3,
        }

    return (
        <div
            className={['tetris-board', compact ? 'tetris-board--compact' : '', className].filter(Boolean).join(' ')}
            style={style}
        >
            {safeBoard.map((row, rowIndex) =>
                row.map((cell, cellIndex) => (
                    <div
                        key={`${rowIndex}-${cellIndex}`}
                        className={[
                            'tetris-cell',
                            cell ? `cell--${cell.type}` : '',
                            cell?.variant === 'ghost' ? 'ghost' : '',
                            cell?.variant === 'filled' ? 'filled' : '',
                            invisibleCells &&
                                cell &&
                                cell?.variant !== 'ghost' &&
                                shouldHideCell(rowIndex, cellIndex, invisibleCellSettings)
                                ? 'invisible'
                                : '',
                            clearingRows.includes(rowIndex) ? 'clearing' : '',
                        ].filter(Boolean).join(' ')}
                    />
                ))
            )}
        </div>
    )
}

export default TetrisBoard
