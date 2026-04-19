export const getTypeStyles = (type) => {
    const styles = {
        success: {
            gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            color: '#10b981',
            lightColor: '#34d399',
            bg: 'rgba(16, 185, 129, 0.05)',
            border: 'rgba(16, 185, 129, 0.3)',
            glow: 'rgba(16, 185, 129, 0.1)',
            icon: 'fa-rocket',
            iconFamily: 'fas',
            title: 'УСПЕШНО',
            rgb: '16, 185, 129'
        },
        error: {
            gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
            color: '#ef4444',
            lightColor: '#f87171',
            bg: 'rgba(239, 68, 68, 0.05)',
            border: 'rgba(239, 68, 68, 0.3)',
            glow: 'rgba(239, 68, 68, 0.1)',
            icon: 'fa-skull-crossbones',
            iconFamily: 'fas',
            title: 'ОШИБКА',
            rgb: '239, 68, 68'
        },
        warning: {
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            color: '#f59e0b',
            lightColor: '#fbbf24',
            bg: 'rgba(245, 158, 11, 0.05)',
            border: 'rgba(245, 158, 11, 0.3)',
            glow: 'rgba(245, 158, 11, 0.1)',
            icon: 'fa-triangle-exclamation',
            iconFamily: 'fas',
            title: 'ПРЕДУПРЕЖДЕНИЕ',
            rgb: '245, 158, 11'
        },
        info: {
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
            color: '#3b82f6',
            lightColor: '#60a5fa',
            bg: 'rgba(59, 130, 246, 0.05)',
            border: 'rgba(59, 130, 246, 0.3)',
            glow: 'rgba(59, 130, 246, 0.1)',
            title: 'ИНФОРМАЦИЯ',
            rgb: '59, 130, 246'
        }
    }
    return styles[type] || styles.success
}

export const toastContainerStyles = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999
}

export const toastAnimation = {
    initial: { opacity: 0, x: 100, scale: 0.8 },
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: 0.4
        }
    },
    exit: {
        opacity: 0,
        x: 100,
        scale: 0.6,
        transition: { duration: 0.2 }
    }
}

export const starAnimation = {
    initial: { opacity: 0 },
    animate: {
        opacity: [0, 1, 0],
        y: [-20, 20]
    },
    transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "loop"
    }
}

export const getProgressBarAnimation = (duration) => ({
    initial: { width: '100%' },
    animate: { width: '0%' },
    transition: { duration: duration / 1000, ease: "linear" }
})

export const glowBorderAnimation = {
    animate: {
        opacity: [0.2, 0.5, 0.2]
    },
    transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse"
    }
}
