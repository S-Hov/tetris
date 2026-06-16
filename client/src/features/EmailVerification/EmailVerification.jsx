import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocalizedPath } from '@/i18n'
import GlowEffect from '@/shared/ui/GlowEffect'
import { authenticationAPI } from '@/shared/api/auth'
import notify from '@/utils/Notifications'
import './EmailVerification.css'

const DEFAULT_CODE_LENGTH = 6

const EmailVerification = () => {
    const { t } = useTranslation()
    const { email: emailParam } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const email = useMemo(() => decodeURIComponent(emailParam || '').trim(), [emailParam])
    const mode = searchParams.get('mode') === 'password-reset' ? 'password-reset' : 'email-verification'
    const isPasswordResetMode = mode === 'password-reset'
    const inputRefs = useRef([])

    const [codeLength, setCodeLength] = useState(DEFAULT_CODE_LENGTH)
    const [digits, setDigits] = useState(() => Array(DEFAULT_CODE_LENGTH).fill(''))
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [nextEmail, setNextEmail] = useState(email)
    const [isChangingEmail, setIsChangingEmail] = useState(false)
    const [message, setMessage] = useState(null)

    const code = digits.join('')
    const isCodeComplete = code.length === codeLength && digits.every(Boolean)
    const canResend = secondsLeft <= 0 && !isLoading && !isSubmitting && !isResending

    useEffect(() => {
        if (!email) {
            setIsLoading(false)
            setMessage({
                type: 'error',
                text: t('emailVerification.invalidLink'),
            })
            notify(t('emailVerification.invalidLink'), 'error')
            return
        }

        let ignore = false

        const loadVerificationMeta = async () => {
            setIsLoading(true)
            setMessage(null)

            try {
                const meta = isPasswordResetMode
                    ? await authenticationAPI.getPasswordResetVerificationTime(email)
                    : await authenticationAPI.getVerificationTime(email)

                if (ignore) return

                const nextCodeLength = normalizeCodeLength(meta.codeLength)

                setCodeLength(nextCodeLength)
                setDigits(Array(nextCodeLength).fill(''))
                setSecondsLeft(Number(meta.expiresInSeconds) || 0)

                if (meta.isVerified) {
                    setMessage({
                        type: 'success',
                        text: t('emailVerification.alreadyVerified'),
                    })
                    notify(t('emailVerification.alreadyVerified'))
                    window.setTimeout(() => navigate(getLocalizedPath('/login'), { replace: true }), 1200)
                }
            } catch (error) {
                if (ignore) return

                setMessage({
                    type: 'error',
                    text: error.message || t('emailVerification.loadError'),
                })
                notify(error.message || t('emailVerification.loadError'), 'error')
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
    }, [email, isPasswordResetMode, navigate, t])

    useEffect(() => {
        setNextEmail(email)
    }, [email])

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
                text: t('emailVerification.fullCode', { length: codeLength }),
            })
            notify(t('emailVerification.fullCode', { length: codeLength }), 'error')
            return
        }

        setIsSubmitting(true)
        setMessage(null)

        try {
            const response = isPasswordResetMode
                ? await authenticationAPI.verifyPasswordReset({ email, code })
                : await authenticationAPI.verifyEmail({ email, code })

            setMessage({
                type: 'success',
                text: isPasswordResetMode
                    ? t('emailVerification.passwordResetSuccess')
                    : t('emailVerification.emailVerified'),
            })
            notify(isPasswordResetMode
                ? t('emailVerification.passwordResetNotify')
                : t('emailVerification.emailVerified'))

            window.setTimeout(() => {
                navigate(getLocalizedPath(response.redirectTo || '/login'), { replace: true })
            }, 1200)
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || t('emailVerification.verifyError'),
            })
            notify(error.message || t('emailVerification.verifyError'), 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResend = async () => {
        if (!canResend) return

        setIsResending(true)
        setMessage(null)

        try {
            const meta = isPasswordResetMode
                ? await authenticationAPI.requestPasswordReset({ email })
                : await authenticationAPI.resendVerificationCode({ email })
            const nextCodeLength = normalizeCodeLength(meta.codeLength)

            setCodeLength(nextCodeLength)
            setDigits(Array(nextCodeLength).fill(''))
            setSecondsLeft(Number(meta.expiresInSeconds) || 0)
            setMessage({
                type: 'info',
                text: t('emailVerification.newCodeSent'),
            })
            notify(t('emailVerification.newCodeSent'), 'info')
            inputRefs.current[0]?.focus()
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || t('emailVerification.resendError'),
            })
            notify(error.message || t('emailVerification.resendError'), 'error')
        } finally {
            setIsResending(false)
        }
    }

    const handleEmailChangeSubmit = async (event) => {
        event.preventDefault()

        setIsChangingEmail(true)
        setMessage(null)

        try {
            const meta = await authenticationAPI.changeUnverifiedEmail({
                currentEmail: email,
                email: nextEmail,
            })

            setIsEmailModalOpen(false)
            notify(t('emailVerification.emailUpdated'), 'success')
            navigate(getLocalizedPath(meta.redirectTo || `/verify-email/${encodeURIComponent(meta.email)}`), { replace: true })
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || t('emailVerification.emailChangeError'),
            })
            notify(error.message || t('emailVerification.emailChangeError'), 'error')
        } finally {
            setIsChangingEmail(false)
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
                            <h2>{isPasswordResetMode ? t('emailVerification.passwordResetTitle') : t('emailVerification.emailTitle')}</h2>
                            <p>{isPasswordResetMode ? t('emailVerification.passwordResetSubtitle') : t('emailVerification.emailSubtitle')}</p>
                            <div className="email-highlight">{email || t('emailVerification.emailMissing')}</div>
                        </div>

                        {message && (
                            <div className={`verify-email-message verify-email-message--${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <form className="verify-email-form" noValidate onSubmit={handleSubmit}>
                            <div className="code-input-group">
                                <label htmlFor="verification-code-0">{t('emailVerification.codeLabel')}</label>
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
                                            aria-label={t('emailVerification.digitAria', { index: index + 1, total: codeLength })}
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
                                {isSubmitting ? t('emailVerification.submitting') : t('emailVerification.submit')}
                            </button>
                        </form>

                        <div className="resend-section">
                            <p className="resend-text">{t('emailVerification.noCode')}</p>
                            <button
                                type="button"
                                className="resend-link"
                                disabled={!canResend}
                                onClick={handleResend}
                            >
                                {isResending ? t('emailVerification.resending') : t('emailVerification.resend')}
                            </button>
                            <div className="timer">
                                {secondsLeft > 0
                                    ? t('emailVerification.codeActive', { time: formatTimer(secondsLeft) })
                                    : t('emailVerification.canRequest')}
                            </div>
                        </div>

                        {isPasswordResetMode ? (
                            <Link to={getLocalizedPath('/login')} className="verify-email-back-link link">
                                {t('emailVerification.backToLogin')}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                className="verify-email-back-link verify-email-link-button link"
                                onClick={() => setIsEmailModalOpen(true)}
                            >
                                {t('emailVerification.changeEmail')}
                            </button>
                        )}
                    </div>
                </GlowEffect>
            </div>

            {isEmailModalOpen && (
                <div className="verify-email-modal" role="dialog" aria-modal="true" aria-labelledby="change-email-title">
                    <form className="verify-email-modal__panel" onSubmit={handleEmailChangeSubmit}>
                        <h3 id="change-email-title">{t('emailVerification.changeEmail')}</h3>
                        <label>
                            <span>{t('emailVerification.currentEmail')}</span>
                            <input type="email" value={email} disabled />
                        </label>
                        <label>
                            <span>{t('emailVerification.newEmail')}</span>
                            <input
                                type="email"
                                value={nextEmail}
                                onChange={(event) => setNextEmail(event.target.value)}
                                autoFocus
                                required
                            />
                        </label>
                        <div className="verify-email-modal__actions">
                            <button type="submit" className="submit-btn" disabled={isChangingEmail}>
                                {isChangingEmail ? t('emailVerification.saving') : t('emailVerification.sendNewCode')}
                            </button>
                            <button
                                type="button"
                                className="verify-email-modal__cancel"
                                onClick={() => setIsEmailModalOpen(false)}
                                disabled={isChangingEmail}
                            >
                                {t('emailVerification.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
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
