import './cyber-bg.css'

const createMosaicTiles = (columns) => (
    columns.flatMap((height, x) => (
        Array.from({ length: height }, (_, y) => {
            const variant = (x + y) % 4

            return {
                x,
                y,
                variant,
                fade: Math.max(0.12, 0.86 - y * 0.11 - variant * 0.035),
                tone: [-7, 0, 6, 12][variant],
                brightness: [1, 1.08, 0.94, 1.14][variant],
            }
        })
    ))
)

const leftTiles = createMosaicTiles([3, 4, 5, 4, 3, 5, 7, 4, 6, 7, 6, 4, 3, 4, 3, 2, 2, 1, 1])
const rightTiles = createMosaicTiles([1, 2, 3, 5, 6, 5, 7, 4, 6, 5, 7, 6, 4, 5, 3, 4, 2, 3, 1, 1])

const renderMosaicTiles = (tiles) => (
    tiles.map((tile) => (
        <span
            className="tetris-mosaic__tile"
            key={`${tile.x}-${tile.y}`}
            style={{
                '--tile-x': tile.x,
                '--tile-y': tile.y,
                '--tile-fade': tile.fade,
                '--tile-tone': `${tile.tone}deg`,
                '--tile-brightness': tile.brightness,
            }}
        />
    ))
)

const cyberBg = () => {
    return (
        <>
            <div className="border-glow"></div>
            <div className="cyber-bg">
                <div className="grid"></div>
                <div className="tetris-mosaic tetris-mosaic--left" aria-hidden="true">
                    <div className="tetris-mosaic__tiles">
                        {renderMosaicTiles(leftTiles)}
                    </div>
                </div>
                <div className="tetris-mosaic tetris-mosaic--right" aria-hidden="true">
                    <div className="tetris-mosaic__tiles">
                        {renderMosaicTiles(rightTiles)}
                    </div>
                </div>
                <div className="glow-orb orb1"></div>
                <div className="glow-orb orb2"></div>
                <div className="glow-orb orb3"></div>
            </div>
        </>
    )
}

export default cyberBg
