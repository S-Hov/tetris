import './darkness-clouds.css'
import fogBottom from './assets/darkness-fog-bottom.png'
import fogSides from './assets/darkness-fog-sides.png'
import fogTop from './assets/darkness-fog-top.png'

const DarknessCloudsScreenEffect = ({ presentation }) => (
    <div
        className="darkness-clouds"
        style={{ '--darkness-accent': presentation?.accent || '#6f7dff' }}
    >
        <div className="darkness-clouds__void" />
        <img className="darkness-clouds__texture darkness-clouds__texture--top" src={fogTop} alt="" />
        <img className="darkness-clouds__texture darkness-clouds__texture--sides" src={fogSides} alt="" />
        <img className="darkness-clouds__texture darkness-clouds__texture--bottom" src={fogBottom} alt="" />
        <div className="darkness-clouds__pulse darkness-clouds__pulse--left" />
        <div className="darkness-clouds__pulse darkness-clouds__pulse--right" />
        <div className="darkness-clouds__pulse darkness-clouds__pulse--center" />
        <div className="darkness-clouds__flicker darkness-clouds__flicker--header" />
        <div className="darkness-clouds__flicker darkness-clouds__flicker--sidebar" />
    </div>
)

export default DarknessCloudsScreenEffect
