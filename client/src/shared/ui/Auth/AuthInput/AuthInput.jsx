import './AuthInput.css'

const AuthInput = ({ input, register = null, error = null }) => {
    
    return (
        <div className='form-group'>
            <div className="input-group">
                <i className={input.icon}></i>
                <input
                    {...(register ? register(input.key) : {})}
                    type={input.type}
                    id={input.key}
                    placeholder={input.placeholder}
                    autoComplete='off'
                    aria-errormessage={input.ariaError}
                    title={input.title}
                />
            </div>
            {error ? error && <small className="form_error-msg" id={input.ariaError}>{error.message}</small>: null}
        </div>
    )
}


export default AuthInput