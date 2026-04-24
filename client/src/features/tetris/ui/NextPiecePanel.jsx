const NextPiecePanel = ({ nextPiece }) => {
    return (
        <section className="game-panel game-next-piece-panel">
            <h3 className="game-panel__title"><i className="fa-solid fa-eye"></i> Next Piece</h3>
            <div className="game-next-piece-panel__preview">
                <div
                    className="game-next-piece-grid"
                    style={{
                        gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, var(--next-piece-cell-size))`,
                        gridTemplateRows: `repeat(${nextPiece.shape.length}, var(--next-piece-cell-size))`,
                    }}
                >
                    {nextPiece.shape.flatMap((row, rowIndex) =>
                        row.map((cell, cellIndex) => (
                            <div
                                key={`${rowIndex}-${cellIndex}`}
                                className={`game-next-piece-cell ${cell ? 'filled' : ''}`}
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    )
}

export default NextPiecePanel
