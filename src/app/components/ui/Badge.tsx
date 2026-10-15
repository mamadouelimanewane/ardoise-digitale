
import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    bg?: string;
    color?: string;
    style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, bg = "#F3F4F6", color = "#374151", style = {} }) => (
    <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 20,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
        ...style
    }}>
        {children}
    </span>
);
