const LoginPage = () => {
    return (
        <section>
            <div className="register-section">
                <div className="glass-card">
                    <div className="form-header">
                        <div className="glow-icon">
                            <i className="fas fa-user-plus"></i>
                        </div>
                        <h2>КИБЕР-РЕГИСТРАЦИЯ</h2>
                        <p>Присоединяйся к элите PvP Tetris ⚡</p>
                    </div>

                    <form id="registerForm">
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
                        Уже есть аккаунт? <a href="#" id="loginRedirect">Войти в систему →</a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default LoginPage