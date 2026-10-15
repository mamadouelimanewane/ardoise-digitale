
import React from 'react';

interface InputProps {
    label?: string;
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, value, onChange, placeholder, type = "text", disabled }) => (
    <div style={{ marginBottom: 12 }}>
        {label && (
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {label}
            </label>
        )}
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #E2E8F0",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                background: disabled ? "#F8FAFC" : "#fff",
                color: disabled ? "#94A3B8" : "#1E293B",
                transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; }}
        />
    </div>
);
