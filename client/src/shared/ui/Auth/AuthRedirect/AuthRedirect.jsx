import { Link } from "react-router-dom"

const AuthRedirect = ({ type }) => {
    return type === 'login'
        ? (
            <div className="form-redirect">
                Нет аккаунта? <Link to="/register" className="link" id="registerRedirect">Создать кибер-аккаунт <i className="fa-solid fa-arrow-right-long"></i></Link>
            </div>
        )
        : (
            <div className="form-redirect">
                Уже есть аккаунт? <Link to='/login' className="link" id="loginRedirect">Войти в систему <i className="fa-solid fa-arrow-right-long"></i></Link>
            </div>
        )
}

export default AuthRedirect