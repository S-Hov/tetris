import LoginForm from "./LoginForm"
import RegisterForm from "./RegisterForm"
import RegisterFormHeader from "../../shared/ui/Auth/AuthHeader/RegisterHeader"

import './AuthForm.css'
import LoginFormHeader from "../../shared/ui/Auth/AuthHeader/LoginHeader"

const AuthForm = (props) => {
    const {
        type = 'login'
    } = props

    return (
        <div className="container auth-container">
            <div className="glass-card">

                {type === 'login'
                    ? <>
                        <LoginFormHeader />
                        <LoginForm />
                    </>
                    : <>
                        <RegisterFormHeader />
                        <RegisterForm />
                    </>
                }

                <div id="formMessage"></div>

                <div className="alternative">
                    <p><i className="fas fa-globe"></i> Или войти через</p>
                    <div className="social-icons">
                        <div className="social-icon"><i className="fab fa-discord"></i></div>
                        <div className="social-icon"><i className="fab fa-google"></i></div>
                        <div className="social-icon"><i className="fab fa-steam"></i></div>
                        <div className="social-icon"><i className="fab fa-twitch"></i></div>
                    </div>
                </div>

                <div className="login-redirect">
                    Уже есть аккаунт? <a href="/login" className="link" id="loginRedirect">Войти в систему →</a>
                </div>
            </div>
        </div>
    )
}

export default AuthForm