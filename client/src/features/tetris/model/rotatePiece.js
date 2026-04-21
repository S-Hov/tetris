export function rotatePiece(piece) {
    const rotatedShape = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[index]).reverse()
    )

    return {
        ...piece,
        shape: rotatedShape,
    }
}
