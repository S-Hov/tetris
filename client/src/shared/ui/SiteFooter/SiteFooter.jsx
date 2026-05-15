import { Link } from 'react-router-dom'
import './SiteFooter.css'

const footerLinks = [
    { to: '/', label: 'Главная' },
    { to: '/about', label: 'О нас' },
    { to: '/support', label: 'Поддержка' },
    { to: '/rating', label: 'Рейтинг' },
    { to: '/profile', label: 'Профиль' },
]

const SiteFooter = () => (
    <footer className="site-footer">
        <div className="container site-footer__container">
            <div className="site-footer__brand">
                <strong>PVP Tetris</strong>
                <span>Честная кибер-арена без pay-to-win</span>
            </div>

            <nav className="site-footer__nav" aria-label="Нижняя навигация">
                {footerLinks.map((link) => (
                    <Link key={link.to} to={link.to}>
                        {link.label}
                    </Link>
                ))}
            </nav>

            <Link to="/about#donate" className="site-footer__donate">
                <i className="fas fa-wallet"></i>
                Поддержать автора
            </Link>
        </div>
    </footer>
)

export default SiteFooter
