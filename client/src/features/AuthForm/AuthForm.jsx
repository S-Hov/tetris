import AuthRedirect from '@/shared/ui/Auth/AuthRedirect/index.js'
import GlowEffect from '@/shared/ui/GlowEffect/index.js'
import AUTH_VIEWS from './AuthViews.config.js'
import { getBaseUrl } from '@/shared/api/apiClient.js'

import './AuthForm.css'

const oauthProviders = [
    { provider: 'google', label: 'Google', icon: 'fab fa-google' },
    { provider: 'discord', label: 'Discord', icon: 'fab fa-discord' },
    { provider: 'steam', label: 'Steam', icon: 'fab fa-steam' },
    { provider: 'yandex', label: 'Yandex', icon: 'fab fa-yandex' },
    { provider: 'vk', label: 'VK', icon: 'fab fa-vk' },
]

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
                                        {oauthProviders.map((item) => (
                                            <a
                                                key={item.provider}
                                                className="social-icon"
                                                href={`${getBaseUrl()}/api/authentication/${item.provider}`}
                                                aria-label={`Войти через ${item.label}`}
                                                title={`Войти через ${item.label}`}
                                            >
                                                <i className={item.icon}></i>
                                            </a>
                                        ))}
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
