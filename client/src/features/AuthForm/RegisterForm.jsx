import AuthInput from "../../shared/ui/Auth/AuthInput"
import { registerInputs } from "./AuthForm.data"

const RegisterForm = () => {
    return (
        <form id="registerForm">
            {
                registerInputs.map((input) => {
                    return <AuthInput input={input} />
                })
            }


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

export default RegisterForm