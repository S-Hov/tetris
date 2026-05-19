import React, { useState } from 'react';

const GlowEffect = ({ children, className = "" }) => {
    const [bgStyle, setBgStyle] = useState({});

    const handleMouseMove = (e) => {
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
            style={{ ...bgStyle, transition: 'background 0.1s ease' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
};

export default GlowEffect;
