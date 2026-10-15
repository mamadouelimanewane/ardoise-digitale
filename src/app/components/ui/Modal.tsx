
import React from 'react';
import { Icons } from './Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, maxHeight: "88vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
                </div>
                <div style={{ overflowY: "auto", padding: "16px 20px 32px", flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};
