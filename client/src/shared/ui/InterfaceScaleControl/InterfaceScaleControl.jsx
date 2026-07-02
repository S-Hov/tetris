import {
    DEFAULT_INTERFACE_SCALE,
    INTERFACE_SCALE_MAX,
    INTERFACE_SCALE_MIN,
    INTERFACE_SCALE_STEP,
} from '@/shared/lib/interface-scale/scale.js'
import { useInterfaceScale } from '@/shared/hooks/useInterfaceScale.js'

import './InterfaceScaleControl.css'

const InterfaceScaleControl = ({
    className = '',
    description,
    resetLabel,
    title,
    valueAriaLabel,
}) => {
    const { interfaceScale, setInterfaceScale } = useInterfaceScale()

    return (
        <div className={`interface-scale-control ${className}`}>
            <div className="interface-scale-control__copy">
                <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                </span>
                <output>{interfaceScale}%</output>
            </div>
            <div className="interface-scale-control__inputs">
                <input
                    aria-label={valueAriaLabel || title}
                    max={INTERFACE_SCALE_MAX}
                    min={INTERFACE_SCALE_MIN}
                    onChange={(event) => setInterfaceScale(event.target.value)}
                    step={INTERFACE_SCALE_STEP}
                    type="range"
                    value={interfaceScale}
                />
                <button
                    type="button"
                    disabled={interfaceScale === DEFAULT_INTERFACE_SCALE}
                    onClick={() => setInterfaceScale(DEFAULT_INTERFACE_SCALE)}
                >
                    {resetLabel}
                </button>
            </div>
        </div>
    )
}

export default InterfaceScaleControl
