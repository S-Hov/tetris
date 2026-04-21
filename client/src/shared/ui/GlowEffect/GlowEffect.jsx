import React, { useState } from 'react';

const GlowEffect = ({ children, className = "" }) => {
    const [bgStyle, setBgStyle] = useState({});

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setBgStyle({
            background: `radial-gradient(circle at ${x}% ${y}%, rgba(0, 255, 255, 0.15), rgba(8, 12, 25, 0))`,
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
