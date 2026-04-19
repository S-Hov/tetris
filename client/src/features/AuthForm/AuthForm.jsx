
import AuthRedirect from './../../shared/ui/Auth/AuthRedirect';
import GlowEffect from "../../shared/ui/GlowEffect"
import AUTH_VIEWS from './AuthViews.config';

import './AuthForm.css'

const AuthForm = ({ type = 'login' }) => {
    const normalizedType = type.toLowerCase()
    const currentView = AUTH_VIEWS[normalizedType] || AUTH_VIEWS.login;

    const { Header, Form } = currentView;

    return (
        <div className="container auth-container">
            <div className="glass-card">
                <GlowEffect>
                    <div className="glow-glass-card">
                        <Header />
                        <Form />

                        <div id="formMessage"></div>

                        {(normalizedType === 'login' || normalizedType === 'register') && (
                            <>
                                <div className="alternative">
                                    <p><i className="fas fa-globe"></i> Или войти через</p>
                                    <div className="social-icons">
                                        <div className="social-icon"><i className="fab fa-discord"></i></div>
                                        <div className="social-icon"><i className="fab fa-google"></i></div>
                                        <div className="social-icon"><i className="fab fa-steam"></i></div>
                                        <div className="social-icon"><i className="fab fa-twitch"></i></div>
                                    </div>
                                </div>
                                <AuthRedirect type={normalizedType} />
                            </>
                        )}
                    </div>
                </GlowEffect>
            </div>
        </div>
    )
}


export default AuthForm
