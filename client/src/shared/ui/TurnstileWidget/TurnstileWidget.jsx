import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import './TurnstileWidget.css'

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let turnstileScriptPromise = null

const loadTurnstileScript = () => {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Turnstile is available only in browser'))
    }

    if (window.turnstile) {
        return Promise.resolve(window.turnstile)
    }

    if (!turnstileScriptPromise) {
        turnstileScriptPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)

            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(window.turnstile), { once: true })
                existingScript.addEventListener('error', reject, { once: true })
                return
            }

            const script = document.createElement('script')
            script.src = TURNSTILE_SCRIPT_SRC
            script.async = true
            script.defer = true
            script.onload = () => resolve(window.turnstile)
            script.onerror = reject
            document.head.appendChild(script)
        })
    }

    return turnstileScriptPromise
}

const TurnstileWidget = forwardRef(function TurnstileWidget({ onTokenChange, className = '', resetSignal = 0 }, ref) {
    const containerRef = useRef(null)
    const widgetIdRef = useRef(null)
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
    const [error, setError] = useState(() => siteKey ? '' : 'Turnstile site key is not configured')

    const reset = useCallback(() => {
        if (window.turnstile && widgetIdRef.current !== null) {
            window.turnstile.reset(widgetIdRef.current)
        }

        onTokenChange('')
    }, [onTokenChange])

    useImperativeHandle(ref, () => ({ reset }))

    useEffect(() => {
        let isMounted = true

        if (!siteKey) {
            onTokenChange('')
            return undefined
        }

        loadTurnstileScript()
            .then((turnstile) => {
                if (!isMounted || !containerRef.current || widgetIdRef.current !== null) {
                    return
                }

                widgetIdRef.current = turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback(token) {
                        setError('')
                        onTokenChange(token)
                    },
                    'expired-callback'() {
                        onTokenChange('')
                    },
                    'error-callback'() {
                        setError('Проверка безопасности не пройдена')
                        onTokenChange('')
                    },
                })
            })
            .catch(() => {
                if (isMounted) {
                    setError('Проверка безопасности не загружена')
                    onTokenChange('')
                }
            })

        return () => {
            isMounted = false

            if (window.turnstile && widgetIdRef.current !== null) {
                window.turnstile.remove(widgetIdRef.current)
                widgetIdRef.current = null
            }
        }
    }, [onTokenChange, siteKey])

    useEffect(() => {
        if (resetSignal > 0) {
            reset()
        }
    }, [reset, resetSignal])

    return (
        <div className={`turnstile-widget ${className}`.trim()}>
            <div ref={containerRef}></div>
            {error ? <div className="turnstile-widget__error">{error}</div> : null}
        </div>
    )
})

export default TurnstileWidget
