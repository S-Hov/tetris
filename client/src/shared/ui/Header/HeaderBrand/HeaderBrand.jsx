import { Link } from 'react-router-dom'
import './HeaderBrand.css'

const HeaderBrand = (props) => {
    const {
        description = true
    } = props

    return (
        <Link to='/' >
            <div className="brand">
                <div className="tetris-icon">
                    <i className="fas fa-cubes"></i>
                </div>

                <div className="logo-text">
                    <h1 className='glow-text'>⚡ PVP TETRIS ⚡</h1>
                    {description ? <p className='description'>BATTLE ARENA • NEO TOURNAMENT</p> : ''}
                </div>
            </div>
        </Link>
    )
}

export default HeaderBrand