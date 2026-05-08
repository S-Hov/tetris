import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './CustomSelect.css'

const CustomSelect = ({
    className = '',
    defaultValue,
    disabled = false,
    name,
    onChange,
    options = [],
    placeholder = 'Выберите значение',
    value,
}) => {
    const generatedId = useId()
    const selectRef = useRef(null)
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? '')
    const [isOpen, setIsOpen] = useState(false)
    const selectedValue = isControlled ? value : internalValue

    const selectedOption = useMemo(
        () => options.find((option) => option.value === selectedValue),
        [options, selectedValue]
    )

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const handlePointerDown = (event) => {
            if (!selectRef.current?.contains(event.target)) {
                setIsOpen(false)
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    const handleSelect = (nextOption) => {
        if (nextOption.disabled) {
            return
        }

        if (!isControlled) {
            setInternalValue(nextOption.value)
        }

        onChange?.(nextOption.value, nextOption)
        setIsOpen(false)
    }

    const handleTriggerKeyDown = (event) => {
        if (disabled) {
            return
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsOpen((currentValue) => !currentValue)
        }
    }

    return (
        <div
            ref={selectRef}
            className={`custom-select ${isOpen ? 'custom-select--open' : ''} ${disabled ? 'custom-select--disabled' : ''} ${className}`}
        >
            {name && <input type="hidden" name={name} value={selectedValue} />}
            <button
                type="button"
                className="custom-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={`${generatedId}-listbox`}
                disabled={disabled}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
                onKeyDown={handleTriggerKeyDown}
            >
                <span>
                    {selectedOption?.icon && <i className={selectedOption.icon}></i>}
                    {selectedOption?.label || placeholder}
                </span>
                <i className="fas fa-chevron-down custom-select__chevron"></i>
            </button>

            {isOpen && (
                <div id={`${generatedId}-listbox`} className="custom-select__menu" role="listbox">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`custom-select__option ${option.value === selectedValue ? 'custom-select__option--active' : ''}`}
                            role="option"
                            aria-selected={option.value === selectedValue}
                            disabled={option.disabled}
                            onClick={() => handleSelect(option)}
                        >
                            <span>
                                {option.icon && <i className={option.icon}></i>}
                                {option.label}
                            </span>
                            {option.description && <small>{option.description}</small>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CustomSelect
