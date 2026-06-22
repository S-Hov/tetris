import './sticky-walls.css'

const WALL_TENDRILS = [
    { y: 3, length: 34, angle: -69, width: 3, delay: -0.1 },
    { y: 7, length: 48, angle: -61, width: 4, delay: -0.7 },
    { y: 12, length: 30, angle: -73, width: 3, delay: -1.3 },
    { y: 18, length: 53, angle: -58, width: 4, delay: -0.4 },
    { y: 24, length: 37, angle: -68, width: 3, delay: -1.7 },
    { y: 31, length: 57, angle: -55, width: 4, delay: -0.9 },
    { y: 38, length: 33, angle: -71, width: 3, delay: -2.1 },
    { y: 45, length: 46, angle: -62, width: 4, delay: -1.1 },
    { y: 52, length: 29, angle: -75, width: 3, delay: -0.3 },
    { y: 59, length: 60, angle: -54, width: 4, delay: -1.9 },
    { y: 66, length: 41, angle: -65, width: 3, delay: -0.6 },
    { y: 72, length: 54, angle: -57, width: 4, delay: -1.5 },
    { y: 78, length: 31, angle: -72, width: 3, delay: -2.2 },
    { y: 84, length: 49, angle: -60, width: 4, delay: -0.8 },
    { y: 89, length: 35, angle: -69, width: 3, delay: -1.8 },
    { y: 94, length: 58, angle: -55, width: 4, delay: -1.2 },
    { y: 98, length: 28, angle: -76, width: 3, delay: -0.5 },
]

const StickyWallsBoardEffect = ({ feedbackActive = false }) => (
    <div
        className={`sticky-walls-board-effect ${feedbackActive ? 'is-impacting' : ''}`}
        aria-hidden="true"
    >
        <div className="sticky-walls-board-effect__surface" />
        <StickyWall side="left" />
        <StickyWall side="right" />
    </div>
)

const StickyWall = ({ side }) => (
    <div className={`sticky-wall sticky-wall--${side}`}>
        <span className="sticky-wall__seam" />
        {WALL_TENDRILS.map((tendril, index) => (
            <span
                className="sticky-wall__tendril"
                key={`${side}-${index}`}
                style={{
                    '--tendril-angle': `${tendril.angle}deg`,
                    '--tendril-delay': `${tendril.delay}s`,
                    '--tendril-entry-delay': `${120 + index * 24}ms`,
                    '--tendril-length': `${tendril.length}px`,
                    '--tendril-width': `${tendril.width}px`,
                    '--tendril-y': `${tendril.y}%`,
                }}
            >
                <span />
            </span>
        ))}
    </div>
)

export default StickyWallsBoardEffect
