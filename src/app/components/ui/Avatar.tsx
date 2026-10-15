
import React from 'react';

interface AvatarProps {
    emoji?: string;
    size?: number;
    bg?: string;
    style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({ emoji, size = 44, bg = "#FFF7ED", style = {} }) => (
    <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        flexShrink: 0,
        ...style
    }}>
        {emoji}
    </div>
);
