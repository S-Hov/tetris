import LoginForm from './LoginForm.jsx'
import LoginFormHeader from '../../shared/ui/Auth/AuthHeader/LoginHeader.jsx'
import RegisterForm from './RegisterForm.jsx'
import RegisterFormHeader from '../../shared/ui/Auth/AuthHeader/RegisterHeader.jsx'

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
