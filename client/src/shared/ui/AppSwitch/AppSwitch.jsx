import './AppSwitch.css'

const AppSwitch = ({ checked = false, className = '' }) => (
    <span className={`app-switch ${checked ? 'app-switch--checked' : ''} ${className}`} aria-hidden="true">
        <span></span>
    </span>
)

export default AppSwitch
