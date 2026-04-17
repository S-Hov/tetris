const AuthRedirect = ({ type }) => {
    return type === 'Login'
        ? (
            <div className="form-redirect">
                Нет аккаунта? <a href="/register" className="link" id="registerRedirect">Создать кибер-аккаунт →</a>
            </div>
        )
        : (
            <div className="form-redirect">
                Уже есть аккаунт? <a href="/login" className="link" id="loginRedirect">Войти в систему →</a>
            </div>
        )
}

export default AuthRedirect