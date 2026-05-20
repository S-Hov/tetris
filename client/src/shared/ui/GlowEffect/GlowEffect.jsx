import React, { useState } from 'react';
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'

const GlowEffect = ({ children, className = "" }) => {
    const [bgStyle, setBgStyle] = useState({});
    const { isGlowEffectEnabled } = useGlowEffect()

    const handleMouseMove = (e) => {
        if (!isGlowEffectEnabled) {
            return
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setBgStyle({
            background: `radial-gradient(circle at ${x}% ${y}%, var(--glow-effect))`,
        });
    };

    const handleMouseLeave = () => {
        setBgStyle({});
    };

    return (
        <div
            className={className}
            style={isGlowEffectEnabled ? { ...bgStyle, transition: 'background 0.1s ease' } : undefined}
            onMouseMove={isGlowEffectEnabled ? handleMouseMove : undefined}
            onMouseLeave={isGlowEffectEnabled ? handleMouseLeave : undefined}
        >
            {children}
        </div>
    );
};

export default GlowEffect;
