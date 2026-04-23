import './TetrisBoard.css'

const TetrisBoard = ({ board, clearingRows = [], compact = false }) => {
    return (
        <div className={`tetris-board${compact ? ' tetris-board--compact' : ''}`}>
            {board.map((row, rowIndex) =>
                row.map((cell, cellIndex) => (
                    <div
                        key={`${rowIndex}-${cellIndex}`}
                        className={[
                            'tetris-cell',
                            cell ? `cell--${cell.type}` : '',
                            cell?.variant === 'ghost' ? 'ghost' : '',
                            cell?.variant === 'filled' ? 'filled' : '',
                            clearingRows.includes(rowIndex) ? 'clearing' : '',
                        ].filter(Boolean).join(' ')}
                    />
                ))
            )}
        </div>
    )
}

export default TetrisBoard
