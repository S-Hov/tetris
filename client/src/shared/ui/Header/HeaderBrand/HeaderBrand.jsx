import { Link } from 'react-router-dom'
import './HeaderBrand.css'
import logo from '@/widgets/Header/assets/logo.png'
import mobileLogo from '@/widgets/Header/assets/logo.png'

const HeaderBrand = (props) => {
    const {
        description = true,
        title = true,
        to = '/',
    } = props

    return (
        <Link to={to} className="brand-link" aria-label="PVP Tetris">
            <div className="brand">
                <picture className="brand-logo">
                    <source media="(max-width: 700px)" srcSet={mobileLogo} />
                    <img src={logo} alt="PVP Tetris" />
                </picture>

                {title || description ? (
                    <div className="logo-text">
                        {title ? <h1 className="glow-text">PVP TETRIS</h1> : null}
                        {description ? <p className="description">BATTLE ARENA</p> : null}
                    </div>
                ) : null}
            </div>
        </Link>
    )
}

export default HeaderBrand
