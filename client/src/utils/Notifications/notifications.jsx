import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

import { getTypeStyles, toastAnimation, starAnimation, getProgressBarAnimation, glowBorderAnimation } from './toastStyles.js'

const TOAST_DURATION = 4000

const getIcon = (type) => {
    switch (type) {
        case 'success':
            return CheckIcon
        case 'error':
            return SkullIcon
        case 'warning':
            return WarningIcon
        default:
            return CheckIcon
    }
}

const iconStyle = {
    width: '1em',
    height: '1em',
    display: 'block',
    fill: 'currentColor'
}

const CheckIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z" />
    </svg>
)

const SkullIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M416 224c0-97.2-78.8-176-176-176S64 126.8 64 224c0 64 34.2 119.9 85.3 150.7L128 416v32c0 8.8 7.2 16 16 16h32v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32h64v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32h32c8.8 0 16-7.2 16-16v-32l-21.3-41.3C381.8 343.9 416 288 416 224ZM176 288a40 40 0 1 1 0-80 40 40 0 0 1 0 80Zm128 0a40 40 0 1 1 0-80 40 40 0 0 1 0 80Zm-48 64c-17.7 0-32-14.3-32-32h64c0 17.7-14.3 32-32 32Z" />
        <path d="M80.5 58.7 58.7 80.5 431.5 453.3l21.8-21.8L80.5 58.7Zm350.9 21.8L58.7 453.3l21.8 21.8L453.3 102.3 431.4 80.5Z" opacity="0.45" />
    </svg>
)

const WarningIcon = () => (
    <svg viewBox="0 0 512 512" aria-hidden="true" style={iconStyle}>
        <path d="M256 48c10.9 0 20.9 5.8 26.3 15.3l216 376c5.4 9.4 5.4 21 0 30.4S482.9 485 472 485H40c-10.9 0-20.9-5.8-26.3-15.3s-5.4-21 0-30.4l216-376C235.1 53.8 245.1 48 256 48Zm0 128c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24s24-10.7 24-24V200c0-13.3-10.7-24-24-24Zm32 224a32 32 0 1 0-64 0 32 32 0 0 0 64 0Z" />
    </svg>
)

const CloseIcon = () => (
    <svg viewBox="0 0 384 512" aria-hidden="true" style={iconStyle}>
        <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3l105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6Z" />
    </svg>
)

const CustomToast = ({ t, message, type, duration }) => {
    const style = getTypeStyles(type)
    const Icon = getIcon(type)
    const progressBarAnimation = getProgressBarAnimation(duration)

    return (
        <motion.div
            {...toastAnimation}
            style={{
                background: 'linear-gradient(135deg, rgba(10, 20, 40, 0.95) 0%, rgba(5, 10, 25, 0.98) 100%)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '12px',
                width: '380px',
                boxShadow: `
                0 10px 25px -5px rgba(0, 0, 0, 0.3),
                0 8px 10px -6px rgba(0, 0, 0, 0.2),
                0 0 0 1px ${style.border},
                0 0 20px ${style.glow}
                `
            }}
        >
            <motion.div
                initial={{ height: '0%' }}
                animate={{ height: '100%' }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '4px',
                    background: `linear-gradient(180deg, ${style.color}, ${style.lightColor}, ${style.color})`,
                    boxShadow: `0 0 8px ${style.color}`
                }}
            />

            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(90deg, ${style.bg} 0%, transparent 100%)`,
                    pointerEvents: 'none'
                }}
            />

            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        {...starAnimation}
                        transition={{
                            ...starAnimation.transition,
                            delay: i * 0.5
                        }}
                        style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            background: 'white',
                            borderRadius: '50%',
                            boxShadow: '0 0 2px white',
                            top: `${20 + i * 30}%`,
                            left: `${5 + i * 15}%`
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10" style={{ padding: '14px 16px' }}>
                <div className="flex items-start gap-3">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '10px'
                    }}>
                    <motion.div
                        initial={{ rotate: 0, scale: 0 }}
                        animate={{
                            scale: 1,
                            transition: {
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                duration: 0.5
                            }
                        }}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${style.bg}, transparent)`,
                            border: `1px solid ${style.border}`,
                            flexShrink: 0
                        }}
                    >
                        <motion.div
                            animate={{
                                rotate: type === 'warning' ? [0, -5, 5, -5, 0] : [0, 10, -10, 0],
                                scale: type === 'warning' ? [1, 1.1, 1] : 1
                            }}
                            transition={{
                                duration: 0.5,
                                delay: 0.2
                            }}
                            style={{ fontSize: '18px', color: style.color }}
                        >
                            <Icon />
                        </motion.div>
                    </motion.div>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        background: style.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        {style.title}
                    </h3>

                    </div>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >

                            <p style={{
                                fontSize: '13px',
                                color: '#d1d5db',
                                lineHeight: 1.4,
                                wordBreak: 'break-word'
                            }}>
                                {message}
                            </p>
                        </motion.div>

                        <motion.div
                            {...progressBarAnimation}
                            style={{
                                height: '2px',
                                background: style.gradient,
                                marginTop: '10px',
                                borderRadius: '1px',
                                boxShadow: `0 0 4px ${style.color}`
                            }}
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation()
                            toast.remove(t.id)
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#9CA3AF',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            position: 'absolute',
                            right: '12px',
                            top: '12px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = `rgba(${style.rgb}, 0.15)`
                            e.currentTarget.style.color = style.color
                            e.currentTarget.style.borderColor = `rgba(${style.rgb}, 0.3)`
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                            e.currentTarget.style.color = '#9CA3AF'
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <CloseIcon />
                    </motion.button>
                </div>
            </div>

            <motion.div
                {...glowBorderAnimation}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '12px',
                    border: '1px solid transparent',
                    background: `linear-gradient(135deg, ${style.bg.replace('0.05', '0.2')}, transparent)`,
                    pointerEvents: 'none',
                    mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                    WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude'
                }}
            />
        </motion.div>
    )
}

export const notify = (message, type = 'success') => {
    toast.custom(
        (t) => <CustomToast t={t} message={message} type={type} duration={TOAST_DURATION} />,
        {
            id: Date.now().toString(),
            duration: TOAST_DURATION,
            position: 'bottom-right'
        }
    )
}
