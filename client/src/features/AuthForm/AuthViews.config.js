import LoginForm from "./LoginForm"
import LoginFormHeader from "../../shared/ui/Auth/AuthHeader/LoginHeader"
import RegisterForm from "./RegisterForm"
import RegisterFormHeader from "../../shared/ui/Auth/AuthHeader/RegisterHeader"

const AUTH_VIEWS = {
    login: {
        Header: LoginFormHeader,
        Form: LoginForm,
    },
    register: {
        Header: RegisterFormHeader,
        Form: RegisterForm,
    },
}

export default AUTH_VIEWS