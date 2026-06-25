import './fog-piece.css'

const FogPieceScreenEffect = () => (
    <div className="fog-piece-effect" aria-hidden="true">
        <div className="fog-piece-effect__breath fog-piece-effect__breath--left" />
        <div className="fog-piece-effect__breath fog-piece-effect__breath--right" />
        <div className="fog-piece-effect__frost" />
    </div>
)

export default FogPieceScreenEffect
