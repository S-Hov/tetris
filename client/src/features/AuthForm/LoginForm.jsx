const LoginForm = () => {
    return (
        <form id="loginForm">
            <div className="input-group">
                <i className="fas fa-user-astronaut"></i>
                <input type="text" id="username" placeholder="Игровой никнейм" autocomplete="off" />
                <div id="usernameError" className="error-msg"></div>
            </div>

            <div className="input-group">
                <i className="fas fa-envelope"></i>
                <input type="email" id="email" placeholder="Электронная почта" />
                <div id="emailError" className="error-msg"></div>
            </div>

            <div className="input-group">
                <i className="fas fa-lock"></i>
                <input type="password" id="password" placeholder="Пароль" />
                <div id="passwordError" className="error-msg"></div>
            </div>

            <div className="input-group">
                <i className="fas fa-key"></i>
                <input type="password" id="confirmPassword" placeholder="Подтверждение пароля" />
                <div id="confirmError" className="error-msg"></div>
            </div>

            <div className="agree-terms">
                <input type="checkbox" id="termsCheckbox" />
                <label for="termsCheckbox">Я соглашаюсь с <span >Условиями Арены</span> и <span
                >Политикой Кибер-безопасности</span></label>
            </div>

            <button type="submit" className="register-btn">
                <i className="fas fa-sync-alt"></i> СОЗДАТЬ АККАУНТ
            </button>
        </form>
    )
}

export default LoginForm