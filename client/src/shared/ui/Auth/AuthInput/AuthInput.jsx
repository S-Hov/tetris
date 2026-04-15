import './AuthInput.css'

const AuthInput = ({ input }) => {

    return (
        <div className="input-group">
            <i className={input.icon}></i>
            <input type={input.type} id={input.key} placeholder={input.placeholder} autoComplete='off' />
            <div id="emailError" className="error-msg"></div>
        </div>
    )
}

export default AuthInput