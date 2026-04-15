import './AuthInput.css'

const AuthInput = ({ input, register, error }) => {
    
    return (
        <div className='form-group'>
            <div className="input-group">
                <i className={input.icon}></i>
                <input
                    {...register(input.key)}
                    type={input.type}
                    id={input.key}
                    placeholder={input.placeholder}
                    autoComplete='off'
                    aria-errormessage={input.ariaError}
                    title={input.title}
                />
            </div>
            {error && <small className="form_error-msg" id={input.ariaError}>{error.message}</small>}
        </div>
    )
}


export default AuthInput