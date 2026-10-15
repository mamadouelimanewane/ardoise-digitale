
import React from 'react';

interface EmptyStateProps {
    icon: string;
    title: string;
    subtitle: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "#9CA3AF" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14 }}>{subtitle}</div>
    </div>
);
