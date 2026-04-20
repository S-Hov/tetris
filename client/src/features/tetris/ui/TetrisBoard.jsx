import './TetrisBoard.css'

const TetrisBoard = ({ board }) => {
    return (
        <div className="tetris-board">
            {board.map((row, rowIndex) =>
                row.map((cell, cellIndex) => (
                    <div
                        key={`${rowIndex}-${cellIndex}`}
                        className={`tetris-cell ${cell ? 'filled' : ''}`}
                    />
                ))
            )}
        </div>
    )
}

export default TetrisBoard