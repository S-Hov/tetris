
export function getStartPosition(piece) {
    return {
        x: Math.floor((10 - piece.shape[0].length) / 2),
        y: 0,
    }
}
