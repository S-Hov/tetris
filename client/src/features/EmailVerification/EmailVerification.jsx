import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GlowEffect from '../../shared/ui/GlowEffect'
import { authenticationAPI } from '../../shared/api/auth'
import notify from '../../utils/Notifications'
import './EmailVerification.css'

const DEFAULT_CODE_LENGTH = 6

const EmailVerification = () => {
    const { email: emailParam } = useParams()
    const navigate = useNavigate()
    const email = useMemo(() => decodeURIComponent(emailParam || '').trim(), [emailParam])
    const inputRefs = useRef([])

    const [codeLength, setCodeLength] = useState(DEFAULT_CODE_LENGTH)
    const [digits, setDigits] = useState(() => Array(DEFAULT_CODE_LENGTH).fill(''))
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [message, setMessage] = useState(null)

    const code = digits.join('')
    const isCodeComplete = code.length === codeLength && digits.every(Boolean)
    const canResend = secondsLeft <= 0 && !isLoading && !isSubmitting && !isResending

    useEffect(() => {
        if (!email) {
            setIsLoading(false)
            setMessage({
                type: 'error',
                text: 'Ссылка подтверждения некорректна. Зарегистрируйтесь ещё раз.',
            })
            notify('Ссылка подтверждения некорректна. Зарегистрируйтесь ещё раз.', 'error')
            return
        }

        let ignore = false

        const loadVerificationMeta = async () => {
            setIsLoading(true)
            setMessage(null)

            try {
                const meta = await authenticationAPI.getVerificationTime(email)

                if (ignore) return

                const nextCodeLength = normalizeCodeLength(meta.codeLength)

                setCodeLength(nextCodeLength)
                setDigits(Array(nextCodeLength).fill(''))
                setSecondsLeft(Number(meta.expiresInSeconds) || 0)

                if (meta.isVerified) {
                    setMessage({
                        type: 'success',
                        text: 'Почта уже подтверждена. Перенаправляем ко входу...',
                    })
                    notify('Почта уже подтверждена. Перенаправляем ко входу...')
                    window.setTimeout(() => navigate('/login', { replace: true }), 1200)
                }
            } catch (error) {
                if (ignore) return

                setMessage({
                    type: 'error',
                    text: error.message || 'Не удалось загрузить данные подтверждения',
                })
                notify(error.message || 'Не удалось загрузить данные подтверждения', 'error')
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        loadVerificationMeta()

        return () => {
            ignore = true
        }
    }, [email, navigate])

    useEffect(() => {
        if (secondsLeft <= 0) return

        const timerId = window.setInterval(() => {
            setSecondsLeft((currentSeconds) => Math.max(0, currentSeconds - 1))
        }, 1000)

        return () => window.clearInterval(timerId)
    }, [secondsLeft])

    useEffect(() => {
        if (!isLoading) {
            inputRefs.current[0]?.focus()
        }
    }, [isLoading, codeLength])

    const updateDigit = (index, value) => {
        const normalizedValue = value.replace(/\D/g, '')

        if (!normalizedValue) {
            setDigits((currentDigits) => replaceDigit(currentDigits, index, ''))
            return
        }

        if (normalizedValue.length > 1) {
            pasteCode(normalizedValue, index)
            return
        }

        setDigits((currentDigits) => replaceDigit(currentDigits, index, normalizedValue))
        inputRefs.current[index + 1]?.focus()
    }

    const pasteCode = (value, startIndex = 0) => {
        const nextDigits = value.replace(/\D/g, '').slice(0, codeLength).split('')

        if (nextDigits.length === 0) return

        setDigits((currentDigits) => {
            const updatedDigits = [...currentDigits]

            nextDigits.forEach((digit, digitIndex) => {
                const targetIndex = startIndex + digitIndex

                if (targetIndex < codeLength) {
                    updatedDigits[targetIndex] = digit
                }
            })

            return updatedDigits
        })

        const focusIndex = Math.min(startIndex + nextDigits.length, codeLength - 1)
        inputRefs.current[focusIndex]?.focus()
    }

    const handleKeyDown = (event, index) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault()
            inputRefs.current[index - 1]?.focus()
        }

        if (event.key === 'ArrowRight' && index < codeLength - 1) {
            event.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handlePaste = (event, index) => {
        event.preventDefault()
        pasteCode(event.clipboardData.getData('text'), index)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!isCodeComplete) {
            setMessage({
                type: 'error',
                text: `Введите полный ${codeLength}-значный код`,
            })
            notify(`Введите полный ${codeLength}-значный код`, 'error')
            return
        }

        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = await authenticationAPI.verifyEmail({ email, code })

            setMessage({
                type: 'success',
                text: 'Почта подтверждена. Перенаправляем ко входу...',
            })
            notify('Почта подтверждена. Перенаправляем ко входу...')

            window.setTimeout(() => {
                navigate(response.redirectTo || '/login', { replace: true })
            }, 1200)
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Не удалось подтвердить почту',
            })
            notify(error.message || 'Не удалось подтвердить почту', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResend = async () => {
        if (!canResend) return

        setIsResending(true)
        setMessage(null)

        try {
            const meta = await authenticationAPI.resendVerificationCode({ email })
            const nextCodeLength = normalizeCodeLength(meta.codeLength)

            setCodeLength(nextCodeLength)
            setDigits(Array(nextCodeLength).fill(''))
            setSecondsLeft(Number(meta.expiresInSeconds) || 0)
            setMessage({
                type: 'info',
                text: 'Новый код отправлен на почту',
            })
            notify('Новый код отправлен на почту', 'info')
            inputRefs.current[0]?.focus()
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Не удалось отправить код повторно',
            })
            notify(error.message || 'Не удалось отправить код повторно', 'error')
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="container verify-email-container">
            <div className="glass-card verify-email-card">
                <GlowEffect>
                    <div className="glow-glass-card verify-email-content">
                        <div className="form-header verify-email-header">
                            <div className="glow-icon">
                                <i className="fas fa-envelope"></i>
                            </div>
                            <h2>Подтверждение почты</h2>
                            <p>Мы отправили код на адрес</p>
                            <div className="email-highlight">{email || 'email не найден'}</div>
                        </div>

                        {message && (
                            <div className={`verify-email-message verify-email-message--${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <form className="verify-email-form" noValidate onSubmit={handleSubmit}>
                            <div className="code-input-group">
                                <label htmlFor="verification-code-0">Код подтверждения</label>
                                <div
                                    className="code-input-wrapper"
                                    style={{ gridTemplateColumns: `repeat(${codeLength}, minmax(0, 1fr))` }}
                                >
                                    {digits.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`verification-code-${index}`}
                                            ref={(element) => {
                                                inputRefs.current[index] = element
                                            }}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={1}
                                            className="code-digit"
                                            value={digit}
                                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                            disabled={isLoading || isSubmitting}
                                            aria-label={`Цифра ${index + 1} из ${codeLength}`}
                                            onChange={(event) => updateDigit(index, event.target.value)}
                                            onKeyDown={(event) => handleKeyDown(event, index)}
                                            onPaste={(event) => handlePaste(event, index)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="verify-btn submit-btn"
                                disabled={isLoading || isSubmitting || !isCodeComplete}
                            >
                                {isSubmitting ? 'ПРОВЕРЯЕМ...' : 'ПОДТВЕРДИТЬ'}
                            </button>
                        </form>

                        <div className="resend-section">
                            <p className="resend-text">Не пришёл код?</p>
                            <button
                                type="button"
                                className="resend-link"
                                disabled={!canResend}
                                onClick={handleResend}
                            >
                                {isResending ? 'Отправляем...' : 'Отправить повторно'}
                            </button>
                            <div className="timer">
                                {secondsLeft > 0
                                    ? `Код действует ещё ${formatTimer(secondsLeft)}`
                                    : 'Можно запросить новый код'}
                            </div>
                        </div>

                        <Link to="/register" className="verify-email-back-link link">
                            Изменить почту
                        </Link>
                    </div>
                </GlowEffect>
            </div>
        </div>
    )
}

const replaceDigit = (digits, index, value) => {
    const updatedDigits = [...digits]
    updatedDigits[index] = value

    return updatedDigits
}

const normalizeCodeLength = (codeLength) => {
    const parsedCodeLength = Number(codeLength)

    if (!Number.isInteger(parsedCodeLength) || parsedCodeLength < 1) {
        return DEFAULT_CODE_LENGTH
    }

    return parsedCodeLength
}

const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export default EmailVerification
