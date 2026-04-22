import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

import {
    getProgressBarAnimation,
    getTypeStyles,
    glowBorderAnimation,
    starAnimation,
} from './toastStyles.js'

const TOAST_DURATION = 3500
const TOAST_REMOVE_DELAY = 220
const MotionDiv = motion.div
const MotionButton = motion.button

const iconStyle = {
    width: '1em',
    height: '1em',
    display: 'block',
    fill: 'currentColor',
}

const renderCheckIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z" />
    </svg>
)

const renderSkullIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M416 224c0-97.2-78.8-176-176-176S64 126.8 64 224c0 64 34.2 119.9 85.3 150.7L128 416v32c0 8.8 7.2 16 16 16h32v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32h64v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32h32c8.8 0 16-7.2 16-16v-32l-21.3-41.3C381.8 343.9 416 288 416 224ZM176 288a40 40 0 1 1 0-80 40 40 0 0 1 0 80Zm128 0a40 40 0 1 1 0-80 40 40 0 0 1 0 80Zm-48 64c-17.7 0-32-14.3-32-32h64c0 17.7-14.3 32-32 32Z" />
        <path d="M80.5 58.7 58.7 80.5 431.5 453.3l21.8-21.8L80.5 58.7Zm350.9 21.8L58.7 453.3l21.8 21.8L453.3 102.3 431.4 80.5Z" opacity="0.45" />
    </svg>
)

const renderWarningIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M256 48c10.9 0 20.9 5.8 26.3 15.3l216 376c5.4 9.4 5.4 21 0 30.4S482.9 485 472 485H40c-10.9 0-20.9-5.8-26.3-15.3s-5.4-21 0-30.4l216-376C235.1 53.8 245.1 48 256 48Zm0 128c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24s24-10.7 24-24V200c0-13.3-10.7-24-24-24Zm32 224a32 32 0 1 0-64 0 32 32 0 0 0 64 0Z" />
    </svg>
)

const renderInfoIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z" />
    </svg>
)

const renderCloseIcon = () => (
    <svg viewBox="0 0 384 512" aria-hidden="true" style={iconStyle}>
        <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3l105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6Z" />
    </svg>
)

const iconsByType = {
    success: renderCheckIcon,
    error: renderSkullIcon,
    warning: renderWarningIcon,
    info: renderInfoIcon,
}

const getToastMotion = (isVisible) => ({
    opacity: isVisible ? 1 : 0,
    x: isVisible ? 0 : 84,
    scale: isVisible ? 1 : 0.92,
})

const renderStars = () => {
    return Array.from({ length: 4 }, (_, index) => (
        <MotionDiv
            key={index}
            {...starAnimation}
            transition={{
                ...starAnimation.transition,
                delay: index * 0.45,
            }}
            style={{
                position: 'absolute',
                width: index % 2 === 0 ? '2px' : '1px',
                height: index % 2 === 0 ? '2px' : '1px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '999px',
                boxShadow: '0 0 6px rgba(255, 255, 255, 0.85)',
                top: `${14 + index * 20}%`,
                left: `${8 + index * 18}%`,
            }}
        />
    ))
}

const renderToastContent = ({ toastItem, message, type, duration }) => {
    const style = getTypeStyles(type)
    const renderIcon = iconsByType[type] || iconsByType.success
    const progressBarAnimation = getProgressBarAnimation(duration)

    return (
        <MotionDiv
            initial={false}
            animate={getToastMotion(toastItem.visible)}
            transition={{
                type: 'spring',
                stiffness: 320,
                damping: 28,
                mass: 0.9,
            }}
            style={{
                background: 'linear-gradient(135deg, rgba(10, 20, 40, 0.95) 0%, rgba(5, 10, 25, 0.98) 100%)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                borderRadius: '14px',
                position: 'relative',
                overflow: 'hidden',
                width: '380px',
                boxShadow: `
                    0 12px 30px -8px rgba(0, 0, 0, 0.38),
                    0 10px 14px -10px rgba(0, 0, 0, 0.28),
                    0 0 0 1px ${style.border},
                    0 0 22px ${style.glow}
                `,
                transformOrigin: 'bottom right',
            }}
        >
            <MotionDiv
                initial={{ height: '0%' }}
                animate={{ height: '100%' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '4px',
                    background: `linear-gradient(180deg, ${style.color}, ${style.lightColor}, ${style.color})`,
                    boxShadow: `0 0 8px ${style.color}`,
                }}
            />

            <MotionDiv
                initial={false}
                animate={{
                    x: toastItem.visible ? '0%' : '-12%',
                    opacity: toastItem.visible ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(90deg, ${style.bg} 0%, transparent 100%)`,
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                {renderStars()}
            </div>

            <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px 12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <MotionDiv
                        initial={false}
                        animate={{
                            scale: toastItem.visible ? 1 : 0.8,
                            rotate: toastItem.visible ? 0 : -10,
                            opacity: toastItem.visible ? 1 : 0,
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 18,
                        }}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${style.bg}, transparent)`,
                            border: `1px solid ${style.border}`,
                            flexShrink: 0,
                            color: style.color,
                        }}
                    >
                        <MotionDiv
                            animate={{
                                rotate: type === 'warning' ? [0, -4, 4, -4, 0] : [0, 8, -8, 0],
                            }}
                            transition={{
                                duration: 0.55,
                                delay: 0.12,
                            }}
                            style={{ fontSize: '18px' }}
                        >
                            {renderIcon()}
                        </MotionDiv>
                    </MotionDiv>

                    <div style={{ flex: 1, minWidth: 0, paddingRight: '28px' }}>
                        <MotionDiv
                            initial={false}
                            animate={{
                                opacity: toastItem.visible ? 1 : 0,
                                y: toastItem.visible ? 0 : 6,
                            }}
                            transition={{ duration: 0.22, delay: toastItem.visible ? 0.06 : 0 }}
                        >
                            <h3
                                style={{
                                    margin: '0 0 6px',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    background: style.gradient,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {style.title}
                            </h3>

                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '13px',
                                    color: '#d1d5db',
                                    lineHeight: 1.45,
                                    wordBreak: 'break-word',
                                }}
                            >
                                {message}
                            </p>
                        </MotionDiv>

                        <MotionDiv
                            {...progressBarAnimation}
                            style={{
                                height: '2px',
                                background: style.gradient,
                                marginTop: '12px',
                                borderRadius: '999px',
                                boxShadow: `0 0 4px ${style.color}`,
                                transformOrigin: 'left center',
                            }}
                        />
                    </div>

                    <MotionButton
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toast.dismiss(toastItem.id)}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: `1px solid ${style.border}`,
                            background: 'rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, background 0.2s ease, color 0.2s ease',
                        }}
                    >
                        {renderCloseIcon()}
                    </MotionButton>
                </div>
            </div>

            <MotionDiv
                {...glowBorderAnimation}
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '14px',
                    border: '1px solid transparent',
                    background: `linear-gradient(135deg, ${style.bg.replace('0.05', '0.2')}, transparent)`,
                    pointerEvents: 'none',
                    mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                    WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                }}
            />
        </MotionDiv>
    )
}

const notify = (message, type = 'success') => {
    const text = typeof message === 'string' ? message.trim() : String(message ?? '').trim()

    if (!text) {
        return
    }

    toast.custom(
        (toastItem) => renderToastContent({
            toastItem,
            message: text,
            type,
            duration: TOAST_DURATION,
        }),
        {
            duration: TOAST_DURATION,
            position: 'bottom-right',
            removeDelay: TOAST_REMOVE_DELAY,
        }
    )
}

export default notify
