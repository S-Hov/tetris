import { Link } from "react-router-dom"

const AuthRedirect = ({ type }) => {
    return type === 'Login'
        ? (
            <div className="form-redirect">
                Нет аккаунта? <Link to="/register" className="link" id="registerRedirect">Создать кибер-аккаунт →</Link>
            </div>
        )
        : (
            <div className="form-redirect">
                Уже есть аккаунт? <Link to='/login'className="link" id="loginRedirect">Войти в систему →</Link>
            </div>
        )
}

export default AuthRedirect