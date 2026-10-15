
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, onClick, style = {} }) => (
    <div
        onClick={onClick}
        style={{
            background: '#fff',
            border: '1px solid #F1F1F4',
            borderRadius: 16,
            padding: 16,
            cursor: onClick ? 'pointer' : 'default',
            ...style
        }}
    >
        {children}
    </div>
);
